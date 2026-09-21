import React, { useState } from 'react';
import { Copy, Check, Terminal, Download, BookOpen, Layers } from 'lucide-react';

export const CodeDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const serverJsContent = `// ========================================================
// KARZAR WebSocket Multiplayer Server (Node.js)
// ========================================================
// Install dependencies:
// npm install ws uuid
// Run server:
// node server.js
// ========================================================

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Karzar Shahnameh Board Game WebSocket Server is Running!\\n');
});

const wss = new WebSocketServer({ server });

// Rooms map: roomCode -> { p1: { ws, name }, p2: { ws, name }, state: {} }
const rooms = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'KZ-' + code;
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    let clientRoom = null;
    let clientPlayerId = null;

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
                    createdAt: Date.now()
                });
                ws.send(JSON.stringify({
                    type: 'ROOM_CREATED',
                    roomCode: roomCode,
                    playerId: 1
                }));
                console.log('Room created: ' + roomCode);
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
                if (room.p1.ws.readyState === ws.OPEN) {
                    room.p1.ws.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        playerName: room.p2.name
                    }));
                }

                // Broadcast Game Start
                const startMsg = JSON.stringify({
                    type: 'GAME_START',
                    startingPlayer: Math.random() < 0.5 ? 1 : 2,
                    seed: Date.now()
                });
                room.p1.ws.send(startMsg);
                room.p2.ws.send(startMsg);
                console.log('Player 2 joined room: ' + roomCode);
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
            else if (action === 'RESTART_GAME') {
                const room = rooms.get(data.roomCode);
                if (room) {
                    const restartMsg = JSON.stringify({
                        type: 'GAME_START',
                        startingPlayer: 1,
                        seed: Date.now()
                    });
                    if (room.p1?.ws?.readyState === ws.OPEN) room.p1.ws.send(restartMsg);
                    if (room.p2?.ws?.readyState === ws.OPEN) room.p2.ws.send(restartMsg);
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
        }
    });
});

server.listen(PORT, () => {
    console.log('Karzar Server is listening on port ' + PORT);
});`;

  const clientJsContent = `// اتصال از کلاینت جاوااسکریپت / وب
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('متصل شد!');
  // ساخت اتاق
  ws.send(JSON.stringify({
    action: 'CREATE_ROOM',
    playerName: 'رستم دستان'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('پیام سرور:', msg);
};`;

  const unityCSharpContent = `// نمونه کد اتصال در Unity (C#) با WebSocket
using System;
using UnityEngine;
using NativeWebSocket; // یا WebSocketSharp

public class KarzarNetworkManager : MonoBehaviour
{
    private WebSocket websocket;
    private string roomCode = "";

    async void Start()
    {
        websocket = new WebSocket("ws://localhost:3000");

        websocket.OnOpen += () => {
            Debug.Log("Connected to Karzar Server!");
        };

        websocket.OnMessage += (bytes) => {
            string message = System.Text.Encoding.UTF8.GetString(bytes);
            Debug.Log("Server Message: " + message);
        };

        await websocket.Connect();
    }

    public void CreateRoom(string name)
    {
        string json = "{\\"action\\":\\"CREATE_ROOM\\",\\"playerName\\":\\"" + name + "\\"}";
        websocket.SendText(json);
    }

    public void JoinRoom(string code, string name)
    {
        string json = "{\\"action\\":\\"JOIN_ROOM\\",\\"roomCode\\":\\"" + code + "\\",\\"playerName\\":\\"" + name + "\\"}";
        websocket.SendText(json);
    }
}`;

  return (
    <div className="mx-auto max-w-5xl py-6 px-4 space-y-8">
      {/* Protocol Reference Table */}
      <div className="rounded-xl border border-slate-800 bg-[#131520] p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            مشخصات فنی پروتکل وب‌سوکت کارزار (Protocol Specification)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-right">
                <th className="py-2.5 px-3">عملکرد / Action</th>
                <th className="py-2.5 px-3">جهت ارسال</th>
                <th className="py-2.5 px-3">پارامترهای ارسالی</th>
                <th className="py-2.5 px-3">پاسخ سرور به کلاینت‌ها</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">GET_ROOMS</td>
                <td className="py-2.5 px-3 text-cyan-400 font-sans">کلاینت ➔ سرور</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left">
                  {'{ "type": "GET_ROOMS" }'}
                </td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-emerald-400">
                  {'{ "type": "ROOM_LIST", "openRooms": [...], "activeRooms": [...] }'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">CREATE_ROOM</td>
                <td className="py-2.5 px-3 text-cyan-400 font-sans">میزبان ➔ سرور</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left">
                  {'{ "type": "CREATE_ROOM", "roomTitle": "...", "playerName": "..." }'}
                </td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-emerald-400">
                  {'{ "type": "ROOM_CREATED", "roomCode": "KZ-XXXX", "playerId": 1 }'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">JOIN_ROOM</td>
                <td className="py-2.5 px-3 text-cyan-400 font-sans">کلاینت ۲ ➔ سرور</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left">
                  {'{ "type": "JOIN_ROOM", "roomCode": "KZ-XXXX", "playerName": "..." }'}
                </td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-emerald-400">
                  {"ROOM_JOINED, PLAYER_JOINED, GAME_START"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">LEAVE_ROOM</td>
                <td className="py-2.5 px-3 text-rose-400 font-sans">کلاینت ➔ سرور</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left">
                  {'{ "type": "LEAVE_ROOM" }'}
                </td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-rose-400">
                  {'{ "type": "OPPONENT_LEFT", "message": "..." }'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">GAME_ACTION</td>
                <td className="py-2.5 px-3 text-cyan-400 font-sans">هر دو بازیکن ➔ سرور</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left">
                  {'{ "type": "GAME_ACTION", "actionType": "SELECT_HERO", "payload": { "heroId": "ROSTAM" } }'}
                </td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-emerald-400">
                  {'{ "type": "ACTION_BROADCAST", "actionType": "...", "payload": {...} }'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-rose-400">قطع ارتباط (close)</td>
                <td className="py-2.5 px-3 text-slate-400 font-sans">رویداد بستن سوکت</td>
                <td className="py-2.5 px-3 text-[11px]">-</td>
                <td className="py-2.5 px-3 text-[11px] dir-ltr text-left text-rose-400">
                  {"{ type: 'OPPONENT_LEFT' } / { type: 'OPPONENT_DISCONNECTED' }"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Server Script Section */}
      <div className="rounded-xl border border-slate-800 bg-[#131520] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">کد کامل سرور Node.js (server.js)</h3>
          </div>
          <button
            onClick={() => copyToClipboard(serverJsContent, 'server')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-amber-500 transition-colors"
          >
            {copiedSection === 'server' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === 'server' ? 'کپی شد!' : 'کپی کد سرور'}</span>
          </button>
        </div>

        <pre className="mt-3 max-h-96 overflow-y-auto rounded-lg bg-black/60 p-4 font-mono text-xs text-slate-300 dir-ltr text-left leading-relaxed">
          {serverJsContent}
        </pre>
      </div>

      {/* Client Examples Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* JS Client */}
        <div className="rounded-xl border border-slate-800 bg-[#131520] p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>کلاینت مرورگر / جاوااسکریپت</span>
            </h4>
            <button
              onClick={() => copyToClipboard(clientJsContent, 'js')}
              className="text-slate-400 hover:text-white"
            >
              {copiedSection === 'js' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <pre className="rounded-lg bg-black/60 p-3 font-mono text-[11px] text-slate-300 dir-ltr text-left overflow-x-auto">
            {clientJsContent}
          </pre>
        </div>

        {/* Unity C# Client */}
        <div className="rounded-xl border border-slate-800 bg-[#131520] p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>کلاینت یونیتی (Unity C#)</span>
            </h4>
            <button
              onClick={() => copyToClipboard(unityCSharpContent, 'unity')}
              className="text-slate-400 hover:text-white"
            >
              {copiedSection === 'unity' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <pre className="rounded-lg bg-black/60 p-3 font-mono text-[11px] text-slate-300 dir-ltr text-left overflow-x-auto">
            {unityCSharpContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
