// ========================================================
// KARZAR WebSocket Multiplayer Server (Node.js) - Clean & Optimized
// ========================================================

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'Karzar WebSocket Server' }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'KZ-' + code;
}

function getRoomListPayload() {
    const openRooms = [];
    const activeRooms = [];

    rooms.forEach((room, roomCode) => {
        if (!room.p2) {
            openRooms.push({
                roomCode: roomCode,
                roomTitle: room.roomTitle || 'اتاق نبرد',
                creatorName: room.p1 ? room.p1.name : 'سازنده',
                creatorId: room.creatorId || null,
                playerCount: 1,
                statusFa: 'در انتظار حریف (۱/۲)'
            });
        } else {
            activeRooms.push({
                roomCode: roomCode,
                roomTitle: room.roomTitle || 'اتاق نبرد',
                creatorName: room.p1 ? room.p1.name : 'بازیکن ۱',
                creatorId: room.creatorId || null,
                player2Name: room.p2 ? room.p2.name : 'بازیکن ۲',
                playerCount: 2,
                statusFa: 'در حال نبرد',
                isInProgress: true
            });
        }
    });

    return JSON.stringify({
        type: 'ROOM_LIST',
        openRooms: openRooms,
        activeRooms: activeRooms
    });
}

function broadcastRoomList() {
    const payload = getRoomListPayload();
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 = WebSocket.OPEN
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    let clientRoom = null;
    let clientPlayerId = null;

    // Send current room list directly to the connected client
    ws.send(getRoomListPayload());

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            const action = data.action || data.type;

            if (action === 'CREATE_ROOM') {
                const roomCode = generateRoomCode();
                clientRoom = roomCode;
                clientPlayerId = 1;
                rooms.set(roomCode, {
                    p1: { ws, name: data.playerName || 'بازیکن ۱' },
                    p2: null,
                    roomTitle: data.roomTitle || 'اتاق دلاوران',
                    creatorId: data.creatorId || null
                });
                ws.send(JSON.stringify({
                    type: 'ROOM_CREATED',
                    roomCode: roomCode,
                    playerId: 1
                }));
                console.log('Room created: ' + roomCode);
                broadcastRoomList();
            }
            else if (action === 'JOIN_ROOM') {
                const roomCode = data.roomCode?.toUpperCase();
                const room = rooms.get(roomCode);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'اتاق با این کد یافت نشد!' }));
                    return;
                }
                if (room.p2 && room.p2.ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'اتاق پر است (حداکثر ۲ بازیکن)!' }));
                    return;
                }
                clientRoom = roomCode;
                clientPlayerId = 2;
                room.p2 = { ws, name: data.playerName || 'بازیکن ۲' };

                // Notify P2
                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    roomCode: roomCode,
                    playerId: 2,
                    opponentName: room.p1.name
                }));

                // Notify P1
                if (room.p1 && room.p1.ws.readyState === ws.OPEN) {
                    room.p1.ws.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        playerName: room.p2.name
                    }));
                }

                // Broadcast Game Start
                const startMsg = JSON.stringify({
                    type: 'GAME_START',
                    startingPlayer: Math.random() < 0.5 ? 1 : 2
                });
                if (room.p1 && room.p1.ws.readyState === ws.OPEN) room.p1.ws.send(startMsg);
                if (room.p2 && room.p2.ws.readyState === ws.OPEN) room.p2.ws.send(startMsg);
                console.log('Player 2 joined room: ' + roomCode);
                broadcastRoomList();
            }
            else if (action === 'GET_ROOMS') {
                // Send room list only to the requesting client
                ws.send(getRoomListPayload());
            }
            else if (action === 'LEAVE_ROOM') {
                if (clientRoom && rooms.has(clientRoom)) {
                    const room = rooms.get(clientRoom);
                    const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                    if (opponent && opponent.ws && opponent.ws.readyState === ws.OPEN) {
                        opponent.ws.send(JSON.stringify({ type: 'OPPONENT_DISCONNECTED' }));
                    }
                    rooms.delete(clientRoom);
                    broadcastRoomList();
                }
            }
            else if (action === 'GAME_ACTION') {
                const roomCode = data.roomCode;
                const room = rooms.get(roomCode);
                if (room) {
                    const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                    if (opponent && opponent.ws && opponent.ws.readyState === ws.OPEN) {
                        opponent.ws.send(JSON.stringify({
                            type: 'ACTION_BROADCAST',
                            playerId: clientPlayerId,
                            actionType: data.actionType,
                            payload: data.payload
                        }));
                    }
                }
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });

    ws.on('close', () => {
        if (clientRoom && rooms.has(clientRoom)) {
            const room = rooms.get(clientRoom);
            const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
            if (opponent && opponent.ws && opponent.ws.readyState === ws.OPEN) {
                opponent.ws.send(JSON.stringify({ type: 'OPPONENT_DISCONNECTED' }));
            }
            if (clientPlayerId === 1 && !room.p2) {
                rooms.delete(clientRoom);
            }
            broadcastRoomList();
        }
    });
});

server.listen(PORT, () => {
    console.log('Karzar WebSocket Server is listening on port ' + PORT);
});
