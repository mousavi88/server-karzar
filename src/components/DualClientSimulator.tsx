import React, { useState, useEffect, useRef } from 'react';
import { Swords, Play, RefreshCw, Send, Dices, Shield, LogOut, CheckCircle2 } from 'lucide-react';

interface SimulatedClient {
  ws: WebSocket | null;
  status: 'disconnected' | 'connecting' | 'connected';
  name: string;
  playerId: 1 | 2 | null;
  roomCode: string | null;
  opponentName: string | null;
  logs: string[];
  hp: number;
}

export const DualClientSimulator: React.FC = () => {
  const [p1, setP1] = useState<SimulatedClient>({
    ws: null,
    status: 'disconnected',
    name: 'رستم دستان',
    playerId: null,
    roomCode: null,
    opponentName: null,
    logs: [],
    hp: 100,
  });

  const [p2, setP2] = useState<SimulatedClient>({
    ws: null,
    status: 'disconnected',
    name: 'سهراب یل',
    playerId: null,
    roomCode: null,
    opponentName: null,
    logs: [],
    hp: 100,
  });

  const p1WsRef = useRef<WebSocket | null>(null);
  const p2WsRef = useRef<WebSocket | null>(null);

  const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  };

  const addLog = (player: 1 | 2, text: string) => {
    const time = new Date().toLocaleTimeString('fa-IR');
    const entry = `[${time}] ${text}`;
    if (player === 1) {
      setP1((prev) => ({ ...prev, logs: [entry, ...prev.logs.slice(0, 40)] }));
    } else {
      setP2((prev) => ({ ...prev, logs: [entry, ...prev.logs.slice(0, 40)] }));
    }
  };

  // Connect Player 1
  const connectP1 = () => {
    if (p1WsRef.current) {
      p1WsRef.current.close();
    }
    const ws = new WebSocket(getWsUrl());
    p1WsRef.current = ws;
    setP1((prev) => ({ ...prev, status: 'connecting' }));

    ws.onopen = () => {
      setP1((prev) => ({ ...prev, status: 'connected', ws }));
      addLog(1, 'متصل به سرور وب‌سوکت شد.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(1, `دریافت: ${data.type}`);

        if (data.type === 'ROOM_CREATED') {
          setP1((prev) => ({
            ...prev,
            roomCode: data.roomCode,
            playerId: data.playerId,
          }));
          addLog(1, `اتاق با کد ${data.roomCode} ساخته شد.`);
        } else if (data.type === 'PLAYER_JOINED') {
          setP1((prev) => ({ ...prev, opponentName: data.playerName }));
          addLog(1, `${data.playerName} به اتاق پیوست.`);
        } else if (data.type === 'GAME_START') {
          addLog(1, `بازی آغاز شد! نوبت شروع: بازیکن ${data.startingPlayer}`);
        } else if (data.type === 'ACTION_BROADCAST') {
          addLog(1, `اقدام حریف: ${data.actionType} (${JSON.stringify(data.payload)})`);
          if (data.actionType === 'ATTACK') {
            const dmg = data.payload?.damage || 10;
            setP1((prev) => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
          }
        } else if (data.type === 'OPPONENT_DISCONNECTED') {
          addLog(1, 'حریف قطع شد!');
          setP1((prev) => ({ ...prev, opponentName: null }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = () => {
      setP1((prev) => ({ ...prev, status: 'disconnected', ws: null }));
      addLog(1, 'ارتباط با سرور قطع شد.');
    };
  };

  // Connect Player 2
  const connectP2 = () => {
    if (p2WsRef.current) {
      p2WsRef.current.close();
    }
    const ws = new WebSocket(getWsUrl());
    p2WsRef.current = ws;
    setP2((prev) => ({ ...prev, status: 'connecting' }));

    ws.onopen = () => {
      setP2((prev) => ({ ...prev, status: 'connected', ws }));
      addLog(2, 'متصل به سرور وب‌سوکت شد.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(2, `دریافت: ${data.type}`);

        if (data.type === 'ROOM_JOINED') {
          setP2((prev) => ({
            ...prev,
            roomCode: data.roomCode,
            playerId: data.playerId,
            opponentName: data.opponentName,
          }));
          addLog(2, `به اتاق ${data.roomCode} پیوست. حریف: ${data.opponentName}`);
        } else if (data.type === 'GAME_START') {
          addLog(2, `بازی آغاز شد! نوبت شروع: بازیکن ${data.startingPlayer}`);
        } else if (data.type === 'ACTION_BROADCAST') {
          addLog(2, `اقدام حریف: ${data.actionType} (${JSON.stringify(data.payload)})`);
          if (data.actionType === 'ATTACK') {
            const dmg = data.payload?.damage || 10;
            setP2((prev) => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
          }
        } else if (data.type === 'OPPONENT_DISCONNECTED') {
          addLog(2, 'حریف قطع شد!');
          setP2((prev) => ({ ...prev, opponentName: null }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = () => {
      setP2((prev) => ({ ...prev, status: 'disconnected', ws: null }));
      addLog(2, 'ارتباط با سرور قطع شد.');
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      p1WsRef.current?.close();
      p2WsRef.current?.close();
    };
  }, []);

  const p1CreateRoom = () => {
    if (p1WsRef.current?.readyState === WebSocket.OPEN) {
      p1WsRef.current.send(
        JSON.stringify({
          type: 'CREATE_ROOM',
          roomTitle: 'میدان شبیه‌ساز کارزار',
          playerName: p1.name,
        })
      );
    }
  };

  const p2JoinRoom = () => {
    if (!p1.roomCode) return;
    if (p2WsRef.current?.readyState === WebSocket.OPEN) {
      p2WsRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode: p1.roomCode,
          playerName: p2.name,
        })
      );
    }
  };

  const sendP1Attack = () => {
    if (!p1.roomCode || !p1WsRef.current) return;
    const damage = Math.floor(Math.random() * 15) + 12;
    p1WsRef.current.send(
      JSON.stringify({
        type: 'GAME_ACTION',
        actionType: 'ATTACK',
        payload: { damage, attackerName: 'رستم دستان', attackName: 'تیر دو پیکان رستم' },
      })
    );
    setP2((prev) => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
    addLog(1, `حمله به سهراب: ${damage} آسیب!`);
  };

  const sendP2Attack = () => {
    if (!p1.roomCode || !p2WsRef.current) return;
    const damage = Math.floor(Math.random() * 15) + 12;
    p2WsRef.current.send(
      JSON.stringify({
        type: 'GAME_ACTION',
        actionType: 'ATTACK',
        payload: { damage, attackerName: 'سهراب یل', attackName: 'ضربت گرز سهراب' },
      })
    );
    setP1((prev) => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
    addLog(2, `حمله به رستم: ${damage} آسیب!`);
  };

  return (
    <div className="mx-auto max-w-6xl py-6 px-4">
      {/* Header Info */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-[#141622] p-4 text-center">
        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
          <span>👥 شبیه‌ساز همزمان دو بازیکن در یک صفحه (Dual Client Playground)</span>
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          این بخش دو سوکت واقعی و مجزا به سرور کارزار باز می‌کند تا بتوانید روند ساخت اتاق، پیوستن،
          ارسال اکشن‌ها و پیام‌های رویداد را به‌صورت زنده و بی‌درنگ در یک نگاه آزمایش کنید.
        </p>
      </div>

      {/* Split Columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Player 1 (Host / Rostam) */}
        <div className="flex flex-col rounded-xl border border-amber-500/30 bg-[#151724] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30">
                کلاینت ۱ (میزبان)
              </span>
              <h4 className="mt-1 text-base font-black text-white">{p1.name}</h4>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  p1.status === 'connected'
                    ? 'bg-emerald-400'
                    : p1.status === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              ></span>
              <span className="text-xs text-slate-300">
                {p1.status === 'connected'
                  ? 'متصل'
                  : p1.status === 'connecting'
                  ? 'در حال اتصال...'
                  : 'قطع'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-3">
            {p1.status !== 'connected' ? (
              <button
                onClick={connectP1}
                className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2 text-xs transition-colors cursor-pointer"
              >
                اتصال کلاینت ۱ به سرور
              </button>
            ) : !p1.roomCode ? (
              <button
                onClick={p1CreateRoom}
                className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold py-2 text-xs transition-colors cursor-pointer shadow-md"
              >
                ساخت اتاق کارزار (CREATE_ROOM)
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/40 bg-black/40 p-2.5 text-center font-mono">
                  <span className="text-[11px] text-slate-400 block">کد اتاق ایجاد شده:</span>
                  <span className="text-xl font-bold text-amber-400 tracking-wider">
                    {p1.roomCode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>جان رستم:</span>
                  <span className="text-rose-400 font-bold font-mono">{p1.hp} / 100</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={sendP1Attack}
                    className="flex-1 rounded-lg bg-rose-600/30 border border-rose-500/40 hover:bg-rose-600 text-rose-200 hover:text-white font-bold py-2 text-xs transition-colors cursor-pointer"
                  >
                    حمله به سهراب (GAME_ACTION)
                  </button>
                  <button
                    onClick={() => {
                      p1WsRef.current?.close();
                    }}
                    className="rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 p-2 text-xs transition-colors"
                    title="قطع اتصال برای تست خروج"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="mt-5 flex-1 border-t border-slate-800 pt-3">
            <span className="text-[11px] text-slate-400 font-bold block mb-2">گزارش رویدادهای کلاینت ۱:</span>
            <div className="h-48 overflow-y-auto rounded-lg bg-black/50 p-2.5 font-mono text-[11px] space-y-1 text-slate-300">
              {p1.logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">پیامی ثبت نشده است</div>
              ) : (
                p1.logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        </div>

        {/* Player 2 (Guest / Sohrab) */}
        <div className="flex flex-col rounded-xl border border-cyan-500/30 bg-[#151724] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 border border-cyan-500/30">
                کلاینت ۲ (حریف)
              </span>
              <h4 className="mt-1 text-base font-black text-white">{p2.name}</h4>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  p2.status === 'connected'
                    ? 'bg-emerald-400'
                    : p2.status === 'connecting'
                    ? 'bg-cyan-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              ></span>
              <span className="text-xs text-slate-300">
                {p2.status === 'connected'
                  ? 'متصل'
                  : p2.status === 'connecting'
                  ? 'در حال اتصال...'
                  : 'قطع'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-3">
            {p2.status !== 'connected' ? (
              <button
                onClick={connectP2}
                className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2 text-xs transition-colors cursor-pointer"
              >
                اتصال کلاینت ۲ به سرور
              </button>
            ) : !p2.roomCode ? (
              <button
                onClick={p2JoinRoom}
                disabled={!p1.roomCode}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold py-2 text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {p1.roomCode
                  ? `ورود خودکار به اتاق ${p1.roomCode} (JOIN_ROOM)`
                  : 'ابتدا در کلاینت ۱ اتاق بسازید'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-cyan-500/40 bg-black/40 p-2.5 text-center font-mono">
                  <span className="text-[11px] text-slate-400 block">پیوسته به اتاق:</span>
                  <span className="text-xl font-bold text-cyan-400 tracking-wider">
                    {p2.roomCode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>جان سهراب:</span>
                  <span className="text-rose-400 font-bold font-mono">{p2.hp} / 100</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={sendP2Attack}
                    className="flex-1 rounded-lg bg-rose-600/30 border border-rose-500/40 hover:bg-rose-600 text-rose-200 hover:text-white font-bold py-2 text-xs transition-colors cursor-pointer"
                  >
                    حمله به رستم (GAME_ACTION)
                  </button>
                  <button
                    onClick={() => {
                      p2WsRef.current?.close();
                    }}
                    className="rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 p-2 text-xs transition-colors"
                    title="قطع اتصال برای تست خروج"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="mt-5 flex-1 border-t border-slate-800 pt-3">
            <span className="text-[11px] text-slate-400 font-bold block mb-2">گزارش رویدادهای کلاینت ۲:</span>
            <div className="h-48 overflow-y-auto rounded-lg bg-black/50 p-2.5 font-mono text-[11px] space-y-1 text-slate-300">
              {p2.logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">پیامی ثبت نشده است</div>
              ) : (
                p2.logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
