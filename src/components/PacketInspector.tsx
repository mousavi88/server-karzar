import React, { useState } from 'react';
import { WsMessage } from '../types';
import { ArrowDownLeft, ArrowUpRight, Trash2, Send, Code, Filter } from 'lucide-react';

interface Props {
  messages: WsMessage[];
  onClear: () => void;
  onSendRaw: (msg: Record<string, unknown>) => void;
  isConnected: boolean;
}

export const PacketInspector: React.FC<Props> = ({
  messages,
  onClear,
  onSendRaw,
  isConnected,
}) => {
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(
      {
        action: 'CREATE_ROOM',
        playerName: 'پهلوان آزمایشی',
      },
      null,
      2
    )
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const filtered = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.direction === filter;
  });

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      onSendRaw(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'فرمت JSON نامعتبر است');
    }
  };

  const loadPreset = (action: string) => {
    switch (action) {
      case 'CREATE_ROOM':
        setJsonInput(
          JSON.stringify(
            { action: 'CREATE_ROOM', playerName: 'رستم دستان' },
            null,
            2
          )
        );
        break;
      case 'JOIN_ROOM':
        setJsonInput(
          JSON.stringify(
            { action: 'JOIN_ROOM', roomCode: 'KZ-ABCD', playerName: 'سهراب یل' },
            null,
            2
          )
        );
        break;
      case 'GAME_ACTION':
        setJsonInput(
          JSON.stringify(
            {
              action: 'GAME_ACTION',
              roomCode: 'KZ-ABCD',
              actionType: 'DICE_ROLL',
              payload: { dice: 6 },
            },
            null,
            2
          )
        );
        break;
      case 'RESTART_GAME':
        setJsonInput(
          JSON.stringify(
            { action: 'RESTART_GAME', roomCode: 'KZ-ABCD' },
            null,
            2
          )
        );
        break;
      case 'PING':
        setJsonInput(JSON.stringify({ action: 'PING' }, null, 2));
        break;
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-6 px-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Packet Stream (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#131520] p-4 h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">
                پکت‌های زنده وب‌سوکت ({filtered.length} پیام)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-900 p-0.5 text-[11px] border border-slate-800">
                <button
                  onClick={() => setFilter('all')}
                  className={`rounded-md px-2.5 py-1 ${
                    filter === 'all' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setFilter('in')}
                  className={`rounded-md px-2.5 py-1 ${
                    filter === 'in' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  دریافتی (IN)
                </button>
                <button
                  onClick={() => setFilter('out')}
                  className={`rounded-md px-2.5 py-1 ${
                    filter === 'out' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  ارسالی (OUT)
                </button>
              </div>

              <button
                onClick={onClear}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                title="پاک کردن پیام‌ها"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Packet List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
            {filtered.length === 0 ? (
              <div className="text-center py-24 text-slate-500 text-xs">
                هیچ پیامی ثبت نشده است. اتصالی برقرار کنید یا پیامی ارسال نمایید.
              </div>
            ) : (
              filtered.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 font-mono text-xs ${
                    msg.direction === 'in'
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-cyan-500/30 bg-cyan-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      {msg.direction === 'in' ? (
                        <>
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">IN (از سرور)</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
                          <span className="text-cyan-400">OUT (به سرور)</span>
                        </>
                      )}
                    </div>
                    <span className="text-slate-500 dir-ltr text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString('fa-IR')}
                    </span>
                  </div>

                  <pre className="mt-2 overflow-x-auto text-[11px] text-slate-300 dir-ltr text-left">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Custom Packet Sender (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-800 bg-[#131520] p-4 h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-400" />
              <span>ارسال پکت سفارشی (Custom Packet)</span>
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {isConnected ? 'ساکت متصل است' : 'ساکت قطع است'}
            </span>
          </div>

          <div className="mt-3">
            <span className="text-[11px] text-slate-400 block mb-1.5">نمونه پکت‌های آماده:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => loadPreset('CREATE_ROOM')}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                CREATE_ROOM
              </button>
              <button
                onClick={() => loadPreset('JOIN_ROOM')}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                JOIN_ROOM
              </button>
              <button
                onClick={() => loadPreset('GAME_ACTION')}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                GAME_ACTION
              </button>
              <button
                onClick={() => loadPreset('RESTART_GAME')}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                RESTART_GAME
              </button>
              <button
                onClick={() => loadPreset('PING')}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                PING
              </button>
            </div>
          </div>

          <form onSubmit={handleSendCustom} className="mt-3 flex-1 flex flex-col">
            <label className="text-[11px] text-slate-400 block mb-1">محتوای بسته JSON:</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="flex-1 w-full rounded-lg border border-slate-700 bg-black/60 p-3 font-mono text-xs text-amber-300 focus:border-cyan-500 focus:outline-none dir-ltr text-left"
              rows={12}
            ></textarea>

            {parseError && (
              <div className="mt-2 rounded bg-rose-950/30 border border-rose-500/30 p-2 text-xs text-rose-300">
                خطا: {parseError}
              </div>
            )}

            <button
              type="submit"
              disabled={!isConnected}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold py-2.5 text-xs transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>ارسال پکت به وب‌سوکت</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
