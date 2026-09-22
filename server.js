// ========================================================
// KARZAR WebSocket Multiplayer Server (Node.js) - Optimized
// ========================================================
// Dependencies: npm install ws
// Run: node server.js
// ========================================================

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3000;

// Rooms Map: roomCode -> roomData
const rooms = new Map();

const server = http.createServer((req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    
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

function generateUniqueRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
        code = 'KZ-';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    return code;
}

function getRoomListPayload() {
    const openRooms = [];
    const activeRooms = [];

    for (const [code, r] of rooms.entries()) {
        const isP2Active = r.p2 && r.p2.ws && r.p2.ws.readyState === WebSocket.OPEN;
        if (!isP2Active) {
            openRooms.push({
                roomCode: code,
                roomTitle: r.roomTitle || 'میدان نبرد',
                creatorName: r.p1?.name || 'ناشناس',
                creatorId: r.p1?.creatorId || null,
                playerCount: 1,
                statusFa: 'در انتظار حریف (۱/۲)'
            });
        } else {
            activeRooms.push({
                roomCode: code,
                roomTitle: r.roomTitle || 'میدان نبرد',
                creatorName: r.p1?.name || 'بازیکن ۱',
                creatorId: r.p1?.creatorId || null,
                player2Name: r.p2?.name || 'بازیکن ۲',
                player1Hero: r.p1?.heroId || null,
                player2Hero: r.p2?.heroId || null,
                currentRound: r.currentRound || 1,
                statusFa: 'در حال نبرد'
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

// ---------------- Heartbeat to clean dead connections ----------------
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// ---------------- WebSocket Event Handlers ----------------
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    let clientRoom = null;
    let clientPlayerId = null;

    // Send initial room list on connect
    ws.send(JSON.stringify(getRoomListPayload()));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            const action = data.action || data.type;

            if (action === 'GET_ROOMS') {
                ws.send(JSON.stringify(getRoomListPayload()));
            }
            else if (action === 'CREATE_ROOM') {
                const roomCode = generateUniqueRoomCode();
                clientRoom = roomCode;
                clientPlayerId = 1;
                const roomTitle = data.roomTitle || 'میدان نبرد';
                const playerName = data.playerName || 'پهلوان ۱';
                const creatorId = data.creatorId || null;

                rooms.set(roomCode, {
                    roomCode,
                    roomTitle,
                    p1: { ws, name: playerName, creatorId, heroId: null },
                    p2: null,
                    currentRound: 1,
                    inGame: false,
                    createdAt: Date.now()
                });

                ws.send(JSON.stringify({
                    type: 'ROOM_CREATED',
                    roomCode: roomCode
                }));

                broadcastRoomList();
            }
            else if (action === 'JOIN_ROOM') {
                const roomCode = data.roomCode?.toUpperCase().trim();
                const room = rooms.get(roomCode);

                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'اتاق با این کد یافت نشد!' }));
                    return;
                }
                if (room.p2 && room.p2.ws && room.p2.ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'ظرفیت اتاق تکمیل است (۲/۲)!' }));
                    return;
                }

                clientRoom = roomCode;
                clientPlayerId = 2;
                const playerName = data.playerName || 'پهلوان ۲';
                room.p2 = { ws, name: playerName, heroId: null };
                room.inGame = true;

                // Notify Player 2
                ws.send(JSON.stringify({
                    type: 'ROOM_JOINED',
                    roomCode: roomCode,
                    playerId: 2,
                    opponentName: room.p1.name
                }));

                // Notify Player 1
                if (room.p1.ws.readyState === WebSocket.OPEN) {
                    room.p1.ws.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        playerName: room.p2.name
                    }));
                }

                // Random starting player (1 or 2)
                const startingPlayer = Math.random() < 0.5 ? 1 : 2;
                const startMsg = JSON.stringify({
                    type: 'GAME_START',
                    startingPlayer: startingPlayer
                });

                if (room.p1.ws.readyState === WebSocket.OPEN) room.p1.ws.send(startMsg);
                if (room.p2.ws.readyState === WebSocket.OPEN) room.p2.ws.send(startMsg);

                broadcastRoomList();
            }
            else if (action === 'GAME_ACTION') {
                const roomCode = data.roomCode || clientRoom;
                const room = roomCode ? rooms.get(roomCode) : null;
                if (!room) return;

                // Track hero selection internally
                if (data.actionType === 'SELECT_HERO' && data.payload?.heroId) {
                    if (clientPlayerId === 1 && room.p1) room.p1.heroId = data.payload.heroId;
                    else if (clientPlayerId === 2 && room.p2) room.p2.heroId = data.payload.heroId;
                } else if (data.actionType === 'NEXT_ROUND' && data.payload?.round) {
                    room.currentRound = data.payload.round;
                }

                // Forward only to the opponent
                const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
                if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                    opponent.ws.send(JSON.stringify({
                        type: 'ACTION_BROADCAST',
                        actionType: data.actionType,
                        payload: data.payload
                    }));
                }
            }
            else if (action === 'LEAVE_ROOM') {
                handleClientLeave(clientRoom, clientPlayerId);
                clientRoom = null;
                clientPlayerId = null;
            }
        } catch (e) {
            console.error('[KARZAR] Error processing message:', e);
        }
    });

    function handleClientLeave(code, pId) {
        if (!code || !rooms.has(code)) return;
        const room = rooms.get(code);

        const opponent = pId === 1 ? room.p2 : room.p1;
        if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
            opponent.ws.send(JSON.stringify({
                type: 'OPPONENT_LEFT',
                message: 'حریف از اتاق خارج شد.'
            }));
        }

        // Close room if creator leaves or if game was already active
        rooms.delete(code);
        broadcastRoomList();
    }

    ws.on('close', () => {
        if (clientRoom) {
            handleClientLeave(clientRoom, clientPlayerId);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[KARZAR] Server running successfully on port ${PORT}`);
});