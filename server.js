// ========================================================
// KARZAR WebSocket Multiplayer Server (Node.js)
// ========================================================
// Install dependencies:
// npm install ws
// Run server:
// node server.js
// ========================================================

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (req.url === '/api/rooms') {
        res.end(JSON.stringify(getRoomListPayload()));
    } else {
        res.end(JSON.stringify({
            status: 'online',
            name: 'Karzar Shahnameh Board Game WebSocket Server',
            activeRooms: rooms.size,
            uptimeSeconds: Math.floor(process.uptime())
        }));
    }
});

const wss = new WebSocketServer({ server });

// Rooms map: roomCode -> { roomCode, roomTitle, p1: { ws, name, heroId }, p2: { ws, name, heroId }, currentRound, createdAt }
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

    for (const [code, r] of rooms.entries()) {
        const isP2Active = r.p2 && r.p2.ws.readyState === WebSocket.OPEN;
        if (!isP2Active) {
            openRooms.push({
                roomCode: code,
                roomTitle: r.roomTitle || 'میدان نبرد',
                creatorName: r.p1.name || 'ناشناس',
                playerCount: 1,
                statusFa: 'در انتظار حریف (۱/۲)'
            });
        } else {
            activeRooms.push({
                roomCode: code,
                roomTitle: r.roomTitle || 'میدان نبرد',
                creatorName: r.p1.name || 'بازیکن ۱',
                player2Name: r.p2?.name || 'بازیکن ۲',
                player1Hero: r.p1.heroId || 'ROSTAM',
                player2Hero: r.p2?.heroId || 'SOHRAB',
                currentRound: r.currentRound || 1
            });
        }
    }

    return {
        type: 'ROOM_LIST',
        openRooms,
        activeRooms
    };
}

function broadcastRoomList() {
    const payloadStr = JSON.stringify(getRoomListPayload());
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payloadStr);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[KARZAR] Client connected');
    let clientRoom = null;
    let clientPlayerId = null;

    // Send room list upon connection
    ws.send(JSON.stringify(getRoomListPayload()));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            const action = data.type || data.action;

            if (action === 'GET_ROOMS') {
                ws.send(JSON.stringify(getRoomListPayload()));
            }
            else if (action === 'CREATE_ROOM') {
                const roomCode = generateRoomCode();
                clientRoom = roomCode;
                clientPlayerId = 1;
                const roomTitle = data.roomTitle || 'میدان نبرد';
                const playerName = data.playerName || 'پهلوان ۱';

                rooms.set(roomCode, {
                    roomCode,
                    roomTitle,
                    p1: { ws, name: playerName, heroId: 'ROSTAM' },
                    p2: null,
                    currentRound: 1,
                    createdAt: Date.now()
                });

                ws.send(JSON.stringify({
                    type: 'ROOM_CREATED',
                    roomCode: roomCode
                }));

                console.log(`[KARZAR] Room created: ${roomCode} ("${roomTitle}") by ${playerName}`);
                broadcastRoomList();
            }
            else if (action === 'JOIN_ROOM') {
                const roomCode = data.roomCode?.toUpperCase().trim();
                const room = rooms.get(roomCode);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'اتاق با این کد یافت نشد!' }));
                    return;
                }
                if (room.p2 && room.p2.ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'اتاق پر است (حداکثر ۲ بازیکن)!' }));
                    return;
                }
                clientRoom = roomCode;
                clientPlayerId = 2;
                const playerName = data.playerName || 'پهلوان ۲';
                room.p2 = { ws, name: playerName, heroId: 'SOHRAB' };

                // Notify P2
                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    roomCode: roomCode,
                    playerId: 2,
                    opponentName: room.p1.name
                }));

                // Notify P1
                if (room.p1.ws.readyState === WebSocket.OPEN) {
                    room.p1.ws.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        playerName: room.p2.name
                    }));
                }

                // Broadcast Game Start to both players
                const startMsg = JSON.stringify({
                    type: 'GAME_START',
                    startingPlayer: 1
                });
                room.p1.ws.send(startMsg);
                room.p2.ws.send(startMsg);

                console.log(`[KARZAR] Player 2 (${playerName}) joined room: ${roomCode}. Game started!`);
                broadcastRoomList();
            }
            else if (action === 'LEAVE_ROOM') {
                if (clientRoom && rooms.has(clientRoom)) {
                    const room = rooms.get(clientRoom);
                    if (room) {
                        const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                        if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                            opponent.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
                        }
                        rooms.delete(clientRoom);
                    }
                    clientRoom = null;
                    clientPlayerId = null;
                    broadcastRoomList();
                }
            }
            else if (action === 'GAME_ACTION') {
                const roomCode = data.roomCode || clientRoom;
                const room = roomCode ? rooms.get(roomCode) : null;
                if (room) {
                    if (data.actionType === 'SELECT_HERO' && data.payload?.heroId) {
                        if (clientPlayerId === 1) room.p1.heroId = data.payload.heroId;
                        else if (clientPlayerId === 2 && room.p2) room.p2.heroId = data.payload.heroId;
                        broadcastRoomList();
                    } else if (data.actionType === 'NEXT_ROUND' && data.payload?.round) {
                        room.currentRound = data.payload.round;
                        broadcastRoomList();
                    }

                    const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                    if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                        opponent.ws.send(JSON.stringify({
                            type: 'ACTION_BROADCAST',
                            actionType: data.actionType,
                            payload: data.payload
                        }));
                    }
                }
            }
            else if (action === 'RESTART_GAME') {
                const room = rooms.get(data.roomCode || clientRoom);
                if (room) {
                    room.currentRound = 1;
                    const restartMsg = JSON.stringify({
                        type: 'GAME_START',
                        startingPlayer: 1
                    });
                    if (room.p1?.ws?.readyState === WebSocket.OPEN) room.p1.ws.send(restartMsg);
                    if (room.p2?.ws?.readyState === WebSocket.OPEN) room.p2.ws.send(restartMsg);
                    broadcastRoomList();
                }
            }
        } catch (e) {
            console.error('[KARZAR] Error handling message:', e);
        }
    });

    ws.on('close', () => {
        if (clientRoom && rooms.has(clientRoom)) {
            const room = rooms.get(clientRoom);
            if (room) {
                const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                    opponent.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
                }
                if (clientPlayerId === 1 && !room.p2) {
                    rooms.delete(clientRoom);
                } else if (clientPlayerId === 1 && room.p2) {
                    rooms.delete(clientRoom);
                } else if (clientPlayerId === 2) {
                    room.p2 = null;
                }
            }
            broadcastRoomList();
        }
    });
});

server.listen(PORT, () => {
    console.log('Karzar Server is listening on port ' + PORT);
});

