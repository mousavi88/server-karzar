/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, PlayerId, ServerStatus, OpenRoom, ActiveRoom, WsMessage } from './types';
import { ServerHeader } from './components/ServerHeader';
import { BattleArena } from './components/BattleArena';
import { DualClientSimulator } from './components/DualClientSimulator';
import { PacketInspector } from './components/PacketInspector';
import { CodeDocs } from './components/CodeDocs';

export default function App() {
  const [activeTab, setActiveTab] = useState<'arena' | 'dual' | 'packets' | 'code'>('arena');
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [packets, setPackets] = useState<WsMessage[]>([]);

  // Primary Game State for Battle Arena
  const [gameState, setGameState] = useState<GameState>({
    roomCode: null,
    roomTitle: 'میدان نبرد کارزار',
    myPlayerId: null,
    myName: 'رستم دستان',
    myHero: 'ROSTAM',
    opponentName: null,
    opponentHero: null,
    currentTurn: 1,
    currentRound: 1,
    p1Health: 100,
    p2Health: 100,
    p1Dice: null,
    p2Dice: null,
    gameStarted: false,
    winner: null,
    battleLog: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number | null>(null);

  const getWsUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  // Fetch REST API status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      // Ignored if server still starting
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setOpenRooms(data.openRooms || []);
        setActiveRooms(data.activeRooms || []);
      }
    } catch {
      // Ignored
    }
  }, []);

  const addBattleLog = useCallback(
    (text: string, sender: 'p1' | 'p2' | 'system' = 'system') => {
      const time = new Date().toLocaleTimeString('fa-IR');
      setGameState((prev) => ({
        ...prev,
        battleLog: [
          {
            id: Math.random().toString(36).substring(2, 9),
            text,
            sender,
            time,
          },
          ...prev.battleLog,
        ],
      }));
    },
    []
  );

  const addPacket = useCallback((direction: 'in' | 'out', data: Record<string, unknown>) => {
    setPackets((prev) => [
      {
        direction,
        timestamp: Date.now(),
        data,
      },
      ...prev.slice(0, 99),
    ]);
  }, []);

  // Send raw message over primary WebSocket
  const sendMessage = useCallback(
    (msg: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        addPacket('out', msg);
        wsRef.current.send(JSON.stringify(msg));
      } else {
        console.warn('Cannot send message, WebSocket not open');
      }
    },
    [addPacket]
  );

  // Initialize and maintain primary WebSocket connection
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let pingInterval: NodeJS.Timeout;

    const connect = () => {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        fetchStatus();
        // Request room list on connect via JSON protocol
        sendMessage({ type: 'GET_ROOMS' });

        // Start ping interval
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimestampRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addPacket('in', data);

          if (data.type === 'PONG') {
            if (pingTimestampRef.current) {
              setPingMs(Date.now() - pingTimestampRef.current);
            }
            return;
          }

          if (data.type === 'ROOM_LIST') {
            setOpenRooms(data.openRooms || []);
            setActiveRooms(data.activeRooms || []);
          } else if (data.type === 'ROOM_CREATED') {
            setGameState((prev) => ({
              ...prev,
              roomCode: data.roomCode,
              myPlayerId: 1,
              gameStarted: false,
              p1Health: 100,
              p2Health: 100,
            }));
            addBattleLog(`اتاق ${data.roomCode} با موفقیت ساخته شد. در انتظار حریف (۱/۲)...`, 'system');
          } else if (data.type === 'ROOM_JOINED') {
            setGameState((prev) => ({
              ...prev,
              roomCode: data.roomCode,
              myPlayerId: 2,
              opponentName: data.opponentName || 'پهلوان ۱',
              p1Health: 100,
              p2Health: 100,
            }));
            addBattleLog(`به اتاق ${data.roomCode} پیوستید. هماورد شما: ${data.opponentName || 'پهلوان ۱'}`, 'system');
          } else if (data.type === 'PLAYER_JOINED') {
            setGameState((prev) => ({
              ...prev,
              opponentName: data.playerName,
            }));
            addBattleLog(`پهلوان ${data.playerName} وارد میدان کارزار شد!`, 'system');
          } else if (data.type === 'GAME_START') {
            setGameState((prev) => ({
              ...prev,
              gameStarted: true,
              currentTurn: (data.startingPlayer || 1) as PlayerId,
              currentRound: 1,
              p1Dice: null,
              p2Dice: null,
              p1Health: 100,
              p2Health: 100,
              winner: null,
            }));
            addBattleLog(
              `⚔️ طبل نبرد نواخته شد! بازی آغاز گشت. نوبت اول: بازیکن ${data.startingPlayer || 1}`,
              'system'
            );
          } else if (data.type === 'ACTION_BROADCAST') {
            const actionType = data.actionType;
            const payload = data.payload || {};

            if (actionType === 'SELECT_HERO') {
              const heroId = payload.heroId;
              const heroName = payload.heroName || heroId;
              setGameState((prev) => ({
                ...prev,
                opponentHero: heroId,
              }));
              addBattleLog(`👑 حریف پهلوان [${heroName}] را برگزید!`, 'p2');
            } else if (actionType === 'DICE_ROLL') {
              const roll = payload.diceValue;
              setGameState((prev) => ({
                ...prev,
                p2Dice: roll,
              }));
              addBattleLog(
                `🎲 ${payload.playerName || 'حریف'} تاس انداخت و عدد [${roll}] آمد!`,
                'p2'
              );
            } else if (actionType === 'ATTACK') {
              const damage = payload.damage || 15;
              setGameState((prev) => {
                const nextHp = Math.max(0, prev.p1Health - damage);
                return {
                  ...prev,
                  p1Health: nextHp,
                  currentTurn: 1,
                };
              });
              addBattleLog(
                `⚔️ ${payload.attackerName || 'حریف'} شمشیر کشید و ${damage} آسیب وارد نمود!`,
                'p2'
              );
            } else if (actionType === 'DEFEND') {
              const armor = payload.armor || 10;
              setGameState((prev) => ({
                ...prev,
                currentTurn: 1,
              }));
              addBattleLog(
                `🛡️ ${payload.defenderName || 'حریف'} سپر برکشید (+${armor} دفاع)!`,
                'p2'
              );
            } else if (actionType === 'PLAY_CARD') {
              addBattleLog(
                `✨ ${payload.playerName || 'حریف'} کارت [${payload.cardName}] را به میدان آورد! (${payload.description || ''})`,
                'p2'
              );
            } else if (actionType === 'CHAT') {
              addBattleLog(`💬 ${payload.senderName || 'حریف'}: "${payload.text}"`, 'p2');
            }
          } else if (data.type === 'OPPONENT_LEFT' || data.type === 'OPPONENT_DISCONNECTED') {
            addBattleLog('⚠️ هماورد از اتاق خارج شد یا اتصال وب‌سوکت وی قطع گردید.', 'system');
            setGameState((prev) => ({
              ...prev,
              opponentName: null,
              opponentHero: null,
              gameStarted: false,
            }));
          } else if (data.type === 'ERROR') {
            addBattleLog(`❌ خطا از سرور: ${data.message}`, 'system');
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval(pingInterval);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection state:', ws.readyState, e);
      };
    };

    connect();
    fetchStatus();

    const statsTimer = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      clearInterval(statsTimer);
      wsRef.current?.close();
    };
  }, [fetchStatus, getWsUrl, addBattleLog, addPacket, sendMessage]);

  const handleResetGame = () => {
    sendMessage({ type: 'LEAVE_ROOM' });
    setGameState((prev) => ({
      ...prev,
      roomCode: null,
      myPlayerId: null,
      gameStarted: false,
      opponentName: null,
      opponentHero: null,
      p1Health: 100,
      p2Health: 100,
      p1Dice: null,
      p2Dice: null,
    }));
    sendMessage({ type: 'GET_ROOMS' });
  };

  const handleRefreshRooms = useCallback(() => {
    sendMessage({ type: 'GET_ROOMS' });
  }, [sendMessage]);

  const handleClearPackets = useCallback(() => {
    setPackets([]);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0e15] text-slate-100 flex flex-col font-['Vazirmatn']">
      {/* Navigation & Header */}
      <ServerHeader
        isConnected={isConnected}
        serverStatus={serverStatus}
        pingMs={pingMs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Tab Content */}
      <main className="flex-1">
        {activeTab === 'arena' && (
          <BattleArena
            gameState={gameState}
            setGameState={setGameState}
            onSendMessage={sendMessage}
            onResetGame={handleResetGame}
            openRooms={openRooms}
            activeRooms={activeRooms}
            onRefreshRooms={handleRefreshRooms}
          />
        )}

        {activeTab === 'dual' && <DualClientSimulator />}

        {activeTab === 'packets' && (
          <PacketInspector
            messages={packets}
            onClear={handleClearPackets}
            onSendRaw={sendMessage}
            isConnected={isConnected}
          />
        )}

        {activeTab === 'code' && <CodeDocs />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#090a0f] py-4 px-6 text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <span>
            سرور وب‌سوکت بازی کارزار شاهنامه (Node.js & WebSocket) • پورت ۳۰۰۰
          </span>
          <span className="font-mono text-[11px] text-amber-500/80">
            JSON Schema: GET_ROOMS | CREATE_ROOM | JOIN_ROOM | LEAVE_ROOM | GAME_ACTION
          </span>
        </div>
      </footer>
    </div>
  );
}

