import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface PlayerSlot {
  ws: WebSocket;
  name: string;
  heroId?: string;
}

interface RoomData {
  roomCode: string;
  roomTitle: string;
  p1: PlayerSlot;
  p2: PlayerSlot | null;
  currentRound: number;
  createdAt: number;
}

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server attached to explicit '/ws' path (and root)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Accept websocket connections on /ws or / (excluding vite internal hmr if any)
    if (pathname === '/ws' || pathname === '/' || !pathname.startsWith('/@vite')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Rooms map: roomCode -> RoomData
  const rooms = new Map<string, RoomData>();

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'KZ-' + code;
  }

  function getRoomListPayload() {
    const openRooms: Array<{
      roomCode: string;
      roomTitle: string;
      creatorName: string;
      playerCount: number;
      statusFa: string;
    }> = [];

    const activeRooms: Array<{
      roomCode: string;
      roomTitle: string;
      creatorName: string;
      player2Name: string;
      player1Hero: string;
      player2Hero: string;
      currentRound: number;
    }> = [];

    for (const [code, r] of rooms.entries()) {
      const isP2Active = r.p2 && r.p2.ws.readyState === WebSocket.OPEN;
      if (!isP2Active) {
        openRooms.push({
          roomCode: code,
          roomTitle: r.roomTitle || 'میدان نبرد',
          creatorName: r.p1.name || 'ناشناس',
          playerCount: 1,
          statusFa: 'در انتظار حریف (۱/۲)',
        });
      } else {
        activeRooms.push({
          roomCode: code,
          roomTitle: r.roomTitle || 'میدان نبرد',
          creatorName: r.p1.name || 'بازیکن ۱',
          player2Name: r.p2?.name || 'بازیکن ۲',
          player1Hero: r.p1.heroId || 'ROSTAM',
          player2Hero: r.p2?.heroId || 'SOHRAB',
          currentRound: r.currentRound || 1,
        });
      }
    }

    return {
      type: 'ROOM_LIST',
      openRooms,
      activeRooms,
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

  // REST API Endpoints
  app.get('/api/status', (_req, res) => {
    let connectedClients = 0;
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) connectedClients++;
    });

    res.json({
      status: 'online',
      name: 'Karzar Shahnameh Board Game WebSocket Server',
      activeRooms: rooms.size,
      connectedClients,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: Date.now(),
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json(getRoomListPayload());
  });

  // WebSocket Connection Lifecycle
  wss.on('connection', (ws: WebSocket) => {
    console.log('[KARZAR] Client connected. Total clients:', wss.clients.size);
    let clientRoom: string | null = null;
    let clientPlayerId: 1 | 2 | null = null;

    // Send initial room list upon connection
    ws.send(JSON.stringify(getRoomListPayload()));

    ws.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        const action = data.type || data.action;

        if (action === 'GET_ROOMS') {
          ws.send(JSON.stringify(getRoomListPayload()));
        } else if (action === 'CREATE_ROOM') {
          const roomCode = generateRoomCode();
          clientRoom = roomCode;
          clientPlayerId = 1;
          const roomTitle = data.roomTitle || 'میدان نبرد کارزار';
          const playerName = data.playerName || 'پهلوان ۱';

          rooms.set(roomCode, {
            roomCode,
            roomTitle,
            p1: { ws, name: playerName, heroId: 'ROSTAM' },
            p2: null,
            currentRound: 1,
            createdAt: Date.now(),
          });

          // Confirm room created to creator
          ws.send(
            JSON.stringify({
              type: 'ROOM_CREATED',
              roomCode: roomCode,
            })
          );
          console.log(`[KARZAR] Room created: ${roomCode} ("${roomTitle}") by ${playerName}`);
          broadcastRoomList();
        } else if (action === 'JOIN_ROOM') {
          const roomCode = (data.roomCode || '')?.toUpperCase().trim();
          const room = rooms.get(roomCode);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'اتاق با این کد یافت نشد!',
              })
            );
            return;
          }
          if (room.p2 && room.p2.ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'اتاق پر است (حداکثر ۲ بازیکن)!',
              })
            );
            return;
          }
          clientRoom = roomCode;
          clientPlayerId = 2;
          const playerName = data.playerName || 'پهلوان ۲';
          room.p2 = { ws, name: playerName, heroId: 'SOHRAB' };

          // Notify P2 with room joined
          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              roomCode: roomCode,
              playerId: 2,
              opponentName: room.p1.name,
            })
          );

          // Notify P1 with player joined
          if (room.p1.ws.readyState === WebSocket.OPEN) {
            room.p1.ws.send(
              JSON.stringify({
                type: 'PLAYER_JOINED',
                playerName: room.p2.name,
              })
            );
          }

          // Broadcast Game Start to BOTH players immediately
          const gameStartMsg = JSON.stringify({
            type: 'GAME_START',
            startingPlayer: 1,
          });

          if (room.p1.ws.readyState === WebSocket.OPEN) room.p1.ws.send(gameStartMsg);
          if (room.p2.ws.readyState === WebSocket.OPEN) room.p2.ws.send(gameStartMsg);

          console.log(`[KARZAR] Player 2 (${playerName}) joined room: ${roomCode}. Game started!`);
          broadcastRoomList();
        } else if (action === 'LEAVE_ROOM') {
          if (clientRoom && rooms.has(clientRoom)) {
            const room = rooms.get(clientRoom);
            if (room) {
              const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
              if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                opponent.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
              }
              rooms.delete(clientRoom);
              console.log(`[KARZAR] Player left room ${clientRoom}. Room removed.`);
            }
            clientRoom = null;
            clientPlayerId = null;
            broadcastRoomList();
          }
        } else if (action === 'GAME_ACTION') {
          const roomCode = data.roomCode || clientRoom;
          const room = roomCode ? rooms.get(roomCode) : null;
          if (room) {
            // If action is hero selection, update server-side room metadata
            if (data.actionType === 'SELECT_HERO' && data.payload?.heroId) {
              if (clientPlayerId === 1) {
                room.p1.heroId = data.payload.heroId;
              } else if (clientPlayerId === 2 && room.p2) {
                room.p2.heroId = data.payload.heroId;
              }
              broadcastRoomList();
            } else if (data.actionType === 'NEXT_ROUND' && data.payload?.round) {
              room.currentRound = data.payload.round;
              broadcastRoomList();
            }

            const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
            if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
              opponent.ws.send(
                JSON.stringify({
                  type: 'ACTION_BROADCAST',
                  actionType: data.actionType,
                  payload: data.payload,
                })
              );
            }
          }
        } else if (action === 'RESTART_GAME') {
          const roomCode = data.roomCode || clientRoom;
          const room = roomCode ? rooms.get(roomCode) : null;
          if (room) {
            room.currentRound = 1;
            const restartMsg = JSON.stringify({
              type: 'GAME_START',
              startingPlayer: 1,
            });
            if (room.p1?.ws?.readyState === WebSocket.OPEN) room.p1.ws.send(restartMsg);
            if (room.p2?.ws?.readyState === WebSocket.OPEN) room.p2.ws.send(restartMsg);
            console.log(`[KARZAR] Room ${roomCode} restarted game`);
            broadcastRoomList();
          }
        } else if (action === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        console.error('[KARZAR] Error handling message:', e);
      }
    });

    ws.on('close', () => {
      console.log('[KARZAR] Client disconnected');
      if (clientRoom && rooms.has(clientRoom)) {
        const room = rooms.get(clientRoom);
        if (room) {
          const opponent = clientPlayerId === 1 ? room.p2 : room.p1;
          if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
            opponent.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
          }
          if (clientPlayerId === 1 && !room.p2) {
            rooms.delete(clientRoom);
            console.log(`[KARZAR] Room ${clientRoom} deleted (P1 left before P2 joined)`);
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

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(`KARZAR Shahnameh Board Game WebSocket Server`);
    console.log(`Listening on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT}`);
    console.log(`========================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
