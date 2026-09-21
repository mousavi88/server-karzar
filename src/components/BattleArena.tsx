import React, { useState, useEffect } from 'react';
import { GameState, HeroCard, OpenRoom, ActiveRoom } from '../types';
import { HERO_CARDS } from '../data/cards';
import {
  Swords,
  Shield,
  Dices,
  RefreshCw,
  LogOut,
  Send,
  Sparkles,
  Copy,
  Check,
  Crown,
  Users,
  Flame,
} from 'lucide-react';

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onSendMessage: (msg: Record<string, unknown>) => void;
  onResetGame: () => void;
  openRooms: OpenRoom[];
  activeRooms: ActiveRoom[];
  onRefreshRooms: () => void;
}

const HERO_ROSTER = [
  { id: 'ROSTAM', name: 'رستم دستان', role: 'پهلوان نامدار ایران', color: 'amber' },
  { id: 'SOHRAB', name: 'سهراب یل', role: 'دلاور جوان توران', color: 'cyan' },
  { id: 'ESFANDIYAR', name: 'اسفندیار رویین‌تن', role: 'شهزاده رویین‌پیکر', color: 'emerald' },
  { id: 'GOUDARZ', name: 'گودرز کشوادگان', role: 'سپهدار خردمند ایران', color: 'indigo' },
  { id: 'SIAVASH', name: 'سیاوش پاک‌زاد', role: 'نماد راستی و جوانمردی', color: 'violet' },
  { id: 'KAVEH', name: 'کاوه آهنگر', role: 'خروش درفش کاویانی', color: 'orange' },
  { id: 'ZAHHAK', name: 'ضحاک ماردوش', role: 'پادشاه اهریمنی', color: 'rose' },
  { id: 'AFRASIAB', name: 'افراسیاب تورانی', role: 'فرمانروای توران', color: 'red' },
];

export const BattleArena: React.FC<Props> = ({
  gameState,
  setGameState,
  onSendMessage,
  onResetGame,
  openRooms,
  activeRooms,
  onRefreshRooms,
}) => {
  const [createTitle, setCreateTitle] = useState('میدان نبرد هفت‌خوان');
  const [createName, setCreateName] = useState('رستم دستان');
  const [joinName, setJoinName] = useState('سهراب یل');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedCard, setSelectedCard] = useState<HeroCard | null>(null);

  useEffect(() => {
    onRefreshRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    onSendMessage({
      type: 'CREATE_ROOM',
      roomTitle: createTitle.trim() || 'میدان نبرد کارزار',
      playerName: createName.trim(),
    });
  };

  const handleJoinRoom = (codeToJoin?: string) => {
    const targetCode = (codeToJoin || joinCode).trim().toUpperCase();
    if (!targetCode) return;
    onSendMessage({
      type: 'JOIN_ROOM',
      roomCode: targetCode,
      playerName: joinName.trim() || 'پهلوان ۲',
    });
  };

  const copyRoomCode = () => {
    if (!gameState.roomCode) return;
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSelectHero = (heroId: string, heroName: string) => {
    setGameState((prev) => ({ ...prev, myHero: heroId }));
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'SELECT_HERO',
      payload: {
        heroId,
        heroName,
      },
    });
  };

  const handleRollDice = () => {
    if (!gameState.roomCode || !gameState.myPlayerId) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    setGameState((prev) => ({
      ...prev,
      p1Dice: roll,
    }));
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'DICE_ROLL',
      payload: {
        diceValue: roll,
        playerName: gameState.myName,
        timestamp: Date.now(),
      },
    });
  };

  const handleAttack = () => {
    if (!gameState.roomCode || !gameState.myPlayerId) return;
    const damage = Math.floor(Math.random() * 15) + 12;
    setGameState((prev) => ({
      ...prev,
      p2Health: Math.max(0, prev.p2Health - damage),
      currentTurn: 2,
    }));
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'ATTACK',
      payload: {
        damage,
        attackerName: gameState.myName,
        critical: Math.random() > 0.7,
      },
    });
  };

  const handleDefend = () => {
    if (!gameState.roomCode || !gameState.myPlayerId) return;
    const armor = Math.floor(Math.random() * 10) + 8;
    setGameState((prev) => ({
      ...prev,
      currentTurn: 2,
    }));
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'DEFEND',
      payload: {
        armor,
        defenderName: gameState.myName,
      },
    });
  };

  const handleNextRound = () => {
    const nextRound = gameState.currentRound + 1;
    setGameState((prev) => ({
      ...prev,
      currentRound: nextRound,
    }));
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'NEXT_ROUND',
      payload: {
        round: nextRound,
      },
    });
  };

  const handlePlayCard = (card: HeroCard) => {
    if (!gameState.roomCode || !gameState.myPlayerId) return;
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'PLAY_CARD',
      payload: {
        cardId: card.id,
        cardName: card.name,
        cardTitle: card.title,
        power: card.power,
        defense: card.defense,
        description: card.description,
        playerName: gameState.myName,
      },
    });
    setSelectedCard(null);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !gameState.roomCode) return;
    onSendMessage({
      type: 'GAME_ACTION',
      actionType: 'CHAT',
      payload: {
        text: chatInput.trim(),
        senderName: gameState.myName,
      },
    });
    setChatInput('');
  };

  const handleRestart = () => {
    if (!gameState.roomCode) return;
    onSendMessage({
      type: 'RESTART_GAME',
      roomCode: gameState.roomCode,
    });
  };

  // View: NOT IN A ROOM YET
  if (!gameState.roomCode) {
    return (
      <div className="mx-auto max-w-5xl py-6 px-4">
        {/* Intro Banner */}
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-[#181926] to-[#12131d] p-6 text-center shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>پروتکل رسمی وب‌سوکت کارزار شاهنامه فردوسی</span>
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl font-['Vazirmatn']">
            میدان نبرد چندنفره کارزار
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            سرور وب‌سوکت آماده پردازش درخواست‌های <span className="font-mono text-amber-400">CREATE_ROOM</span>،{' '}
            <span className="font-mono text-cyan-400">JOIN_ROOM</span> و تبادل داده‌های{' '}
            <span className="font-mono text-emerald-400">GAME_ACTION</span> می‌باشد.
          </p>
        </div>

        {/* Create / Join Forms */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Create Room */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#151722]/90 p-6 shadow-lg backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ساخت اتاق جدید (CREATE_ROOM)</h3>
                  <p className="text-xs text-slate-400">تولید کد اختصاصی KZ-XXXX و تعیین عنوان میدان</p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    عنوان اتاق (roomTitle)
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="مثلاً: میدان نبرد هفت‌خوان"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    نام پهلوان ۱ (playerName)
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="مثلاً: رستم دستان"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="text-amber-400/90 font-medium">پیام ارسالی JSON به سرور:</div>
                  <code className="text-amber-200/90 font-mono text-[10px] block dir-ltr">
                    {'{\n  "type": "CREATE_ROOM",\n  "roomTitle": "' + createTitle + '",\n  "playerName": "' + createName + '"\n}'}
                  </code>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 px-4 text-sm font-bold text-slate-950 shadow-md shadow-amber-950/40 hover:from-amber-500 hover:to-amber-400 transition-all cursor-pointer"
                >
                  ساخت اتاق جدید و شروع میزبانی
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Join Room */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#151722]/90 p-6 shadow-lg backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ورود به اتاق با کد (JOIN_ROOM)</h3>
                  <p className="text-xs text-slate-400">اتصال با کد اتاق (مانند KZ-1001) به عنوان بازیکن ۲</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    کد اتاق (roomCode)
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="KZ-1001"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 uppercase dir-ltr text-center tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    نام پهلوان ۲ (playerName)
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="مثلاً: سهراب یل"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="text-cyan-400/90 font-medium">پیام ارسالی JSON به سرور:</div>
                  <code className="text-cyan-200/90 font-mono text-[10px] block dir-ltr">
                    {'{\n  "type": "JOIN_ROOM",\n  "roomCode": "' + (joinCode || 'KZ-1001') + '",\n  "playerName": "' + joinName + '"\n}'}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinRoom()}
                  disabled={!joinCode.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 py-2.5 px-4 text-sm font-bold text-slate-950 shadow-md shadow-cyan-950/40 hover:from-cyan-500 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  ورود به اتاق و آغاز نبرد
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Active & Open Rooms Browser */}
        <div className="mt-8 space-y-6">
          {/* Section: Open Rooms (1/2) */}
          <div className="rounded-xl border border-slate-800 bg-[#12141e]/90 p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h4 className="text-xs font-bold text-slate-200">اتاق‌های در انتظار حریف (openRooms)</h4>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-400 font-mono">
                  {openRooms.length} اتاق باز
                </span>
              </div>
              <button
                onClick={onRefreshRooms}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>ارسال GET_ROOMS</span>
              </button>
            </div>

            {openRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                در حال حاضر اتاق بازی در انتظار بازیکن نیست. یک اتاق جدید بسازید!
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 hover:border-amber-500/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400 dir-ltr">
                          {room.roomCode}
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                          {room.statusFa}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-1.5">{room.roomTitle}</div>
                      <div className="text-xs text-slate-300 mt-1">
                        میزبان: <span className="text-amber-300 font-medium">{room.creatorName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setJoinCode(room.roomCode);
                        handleJoinRoom(room.roomCode);
                      }}
                      className="mt-3 w-full rounded bg-cyan-600/20 border border-cyan-500/40 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-600/40 transition-colors"
                    >
                      ورود به این اتاق
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Active Rooms (2/2) */}
          {activeRooms.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#12141e]/90 p-5">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <Flame className="h-4 w-4 text-rose-400" />
                <h4 className="text-xs font-bold text-slate-200">نبردهای زنده در حال اجرا (activeRooms)</h4>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-rose-400 font-mono">
                  {activeRooms.length} نبرد فعال
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-300 dir-ltr">{room.roomCode}</span>
                      <span className="text-[10px] text-rose-400 font-bold">دور {room.currentRound}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{room.roomTitle}</div>
                    <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 p-2 rounded">
                      <span>{room.creatorName} ({room.player1Hero})</span>
                      <span className="text-amber-500 font-bold">VS</span>
                      <span>{room.player2Name} ({room.player2Hero})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View: ROOM CREATED BUT WAITING FOR OPPONENT (P1 ONLY)
  if (gameState.roomCode && !gameState.gameStarted && gameState.myPlayerId === 1) {
    return (
      <div className="mx-auto max-w-xl py-12 px-4 text-center">
        <div className="rounded-2xl border border-amber-500/30 bg-[#151722] p-8 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
          </div>

          <h3 className="mt-4 text-xl font-bold text-white">اتاق نبرد کارزار ایجاد شد!</h3>
          <p className="mt-1 text-xs text-slate-400">
            منتظر ورود پهلوان دوم هستیم تا سرور رویداد <span className="font-mono text-amber-400">GAME_START</span> را صادر کند...
          </p>

          {/* Room Code Display */}
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-black/40 p-4">
            <span className="text-xs text-slate-400 block mb-1">کد اختصاصی اتاق:</span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-black font-mono tracking-widest text-amber-400 select-all dir-ltr">
                {gameState.roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-500 transition-colors cursor-pointer"
                title="کپی کد اتاق"
              >
                {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCode ? 'کپی شد!' : 'کپی کد'}</span>
              </button>
            </div>
          </div>

          {/* Hero Selection before start */}
          <div className="mt-6 text-right">
            <label className="text-xs font-bold text-slate-300 block mb-2">
              انتخاب پهلوان شما برای این نبرد (SELECT_HERO):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HERO_ROSTER.slice(0, 4).map((hero) => (
                <button
                  key={hero.id}
                  onClick={() => handleSelectHero(hero.id, hero.name)}
                  className={`rounded-lg p-2 text-center text-xs font-bold transition-all ${
                    gameState.myHero === hero.id
                      ? 'border-2 border-amber-400 bg-amber-950/40 text-amber-200'
                      : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>{hero.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{hero.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onResetGame}
              className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>لغو و خروج (LEAVE_ROOM)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: GAME IN PROGRESS (ACTIVE ARENA)
  const isMyTurn = gameState.currentTurn === gameState.myPlayerId;
  const p1Name = gameState.myPlayerId === 1 ? gameState.myName : gameState.opponentName || 'پهلوان ۱';
  const p2Name = gameState.myPlayerId === 2 ? gameState.myName : gameState.opponentName || 'پهلوان ۲';

  return (
    <div className="mx-auto max-w-6xl py-4 px-3 sm:px-6">
      {/* Game Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#13151f] p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-xs text-slate-400">اتاق فعال:</span>
          <span className="font-mono text-sm font-bold text-amber-400 dir-ltr">{gameState.roomCode}</span>
          <button onClick={copyRoomCode} className="text-slate-400 hover:text-white" title="کپی کد">
            {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-semibold text-slate-300">
            دور {gameState.currentRound}
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-semibold text-slate-300">
            شما: <strong className="text-amber-300">{gameState.myName}</strong> ({gameState.myHero || 'ROSTAM'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNextRound}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-900/50 transition-colors cursor-pointer"
          >
            <Crown className="h-3 w-3" />
            <span>دور بعدی (Round +1)</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            title="ارسال سیگنال GAME_START مجدد"
          >
            <RefreshCw className="h-3 w-3" />
            <span>راه‌اندازی مجدد</span>
          </button>
          <button
            onClick={onResetGame}
            className="flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-1 text-xs text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            <span>خروج (LEAVE_ROOM)</span>
          </button>
        </div>
      </div>

      {/* Turn & Status Banner */}
      <div
        className={`mb-4 rounded-xl border p-3.5 text-center transition-all ${
          isMyTurn
            ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-amber-900/20 to-amber-950/30 text-amber-300'
            : 'border-slate-800 bg-[#161824] text-slate-400'
        }`}
      >
        <div className="flex items-center justify-center gap-2 font-bold text-sm">
          {isMyTurn ? (
            <>
              <Swords className="h-4 w-4 text-amber-400 animate-pulse" />
              <span>نوبت شماست! پهلوان خود را هدایت کنید، تاس بیندازید یا حمله کنید.</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-ping"></span>
              <span>در انتظار حرکت حریف ({gameState.opponentName || 'پهلوان رقیب'})...</span>
            </>
          )}
        </div>
      </div>

      {/* Players Duel Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        {/* Player 1 Card */}
        <div
          className={`relative rounded-xl border p-4 transition-all ${
            gameState.currentTurn === 1
              ? 'border-amber-500/70 bg-[#161929] shadow-lg shadow-amber-950/30'
              : 'border-slate-800 bg-[#12141e]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30">
                پهلوان ۱ (میزبان) {gameState.myPlayerId === 1 && '⭐ شما'}
              </span>
              <h3 className="mt-1 text-lg font-black text-white">{p1Name}</h3>
              <div className="text-xs text-amber-400 font-mono mt-0.5">
                Hero: {gameState.myPlayerId === 1 ? gameState.myHero || 'ROSTAM' : 'ROSTAM'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-mono text-amber-400 border border-amber-500/20">
              <Dices className="h-3.5 w-3.5" />
              <span>تاس: {gameState.p1Dice ?? '-'}</span>
            </div>
          </div>

          {/* Health Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-400">جان پهلوان:</span>
              <span className="text-rose-400 font-mono font-bold">{gameState.p1Health} / 100</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, gameState.p1Health))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className={`relative rounded-xl border p-4 transition-all ${
            gameState.currentTurn === 2
              ? 'border-cyan-500/70 bg-[#161929] shadow-lg shadow-cyan-950/30'
              : 'border-slate-800 bg-[#12141e]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 border border-cyan-500/30">
                پهلوان ۲ (رقیب) {gameState.myPlayerId === 2 && '⭐ شما'}
              </span>
              <h3 className="mt-1 text-lg font-black text-white">{p2Name}</h3>
              <div className="text-xs text-cyan-400 font-mono mt-0.5">
                Hero: {gameState.myPlayerId === 2 ? gameState.myHero || 'SOHRAB' : gameState.opponentHero || 'SOHRAB'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/20">
              <Dices className="h-3.5 w-3.5" />
              <span>تاس: {gameState.p2Dice ?? '-'}</span>
            </div>
          </div>

          {/* Health Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-400">جان پهلوان:</span>
              <span className="text-rose-400 font-mono font-bold">{gameState.p2Health} / 100</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-cyan-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, gameState.p2Health))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Selection Row */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-[#141622] p-4">
        <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-400" />
          <span>تغییر پهلوان در جریان بازی (SELECT_HERO Broadcast):</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {HERO_ROSTER.map((hero) => (
            <button
              key={hero.id}
              onClick={() => handleSelectHero(hero.id, hero.name)}
              className={`rounded-lg p-2 text-center text-xs font-bold transition-all cursor-pointer ${
                gameState.myHero === hero.id
                  ? 'border-2 border-amber-400 bg-amber-950/40 text-amber-200'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="truncate">{hero.name}</div>
              <div className="text-[9px] text-slate-400 font-mono">{hero.id}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Controls & Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1 & 2: Battle Actions & Hero Cards Deck */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Action Buttons */}
          <div className="rounded-xl border border-slate-800 bg-[#141622] p-4">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Swords className="h-4 w-4 text-amber-400" />
              <span>عملیات و اکشن‌های نبرد (GAME_ACTION):</span>
            </h4>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={handleRollDice}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 py-3 px-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Dices className="h-5 w-5 text-amber-400" />
                <span>پرتاب تاس نبرد</span>
              </button>

              <button
                onClick={handleAttack}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 py-3 px-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Swords className="h-5 w-5 text-rose-400" />
                <span>ضربه مستقیم</span>
              </button>

              <button
                onClick={handleDefend}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-3 px-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Shield className="h-5 w-5 text-cyan-400" />
                <span>استحکام زره و دفاع</span>
              </button>
            </div>
          </div>

          {/* Cards of Shahnameh */}
          <div className="rounded-xl border border-slate-800 bg-[#141622] p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>کارت‌های پهلوانی شاهنامه (GAME_ACTION / PLAY_CARD)</span>
              </h4>
              <span className="text-[11px] text-slate-400">انتقال فوری به حریف</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {HERO_CARDS.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`group relative flex flex-col justify-between rounded-lg border p-2.5 transition-all cursor-pointer ${
                    selectedCard?.id === card.id
                      ? 'border-amber-400 bg-amber-950/30 shadow-md ring-1 ring-amber-400'
                      : 'border-slate-800 bg-slate-900/70 hover:border-amber-500/50 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400">{card.type}</span>
                      <span className="text-[10px] font-mono text-slate-400">⚡{card.power}</span>
                    </div>
                    <div className="mt-1 font-bold text-xs text-white">{card.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{card.title}</div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[10px]">
                    <span className="text-rose-400 font-mono">حمله: {card.power}</span>
                    <span className="text-cyan-400 font-mono">دفاع: {card.defense}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(card);
                    }}
                    className="mt-2 w-full rounded bg-amber-600/30 border border-amber-500/40 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-600 hover:text-white transition-colors"
                  >
                    بازی کارت
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Live Battle Log & In-Game Chat */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-[#141622] p-4 h-[500px]">
          <h4 className="text-xs font-bold text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>گزارش نبرد و پیام‌های وب‌سوکت</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {gameState.battleLog.length} پیام
            </span>
          </h4>

          {/* Log Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
            {gameState.battleLog.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                هنوز پیامی ثبت نشده است. روی تاس یا کارت‌ها کلیک کنید!
              </div>
            ) : (
              gameState.battleLog.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg p-2 text-xs leading-relaxed ${
                    log.sender === 'system'
                      ? 'bg-amber-950/20 border border-amber-500/20 text-amber-200'
                      : log.sender === 'p1'
                      ? 'bg-slate-900 border border-slate-800 text-slate-200'
                      : 'bg-cyan-950/20 border border-cyan-500/20 text-cyan-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
                    <span>
                      {log.sender === 'p1' ? p1Name : log.sender === 'p2' ? p2Name : 'سرور کارزار'}
                    </span>
                    <span className="font-mono dir-ltr">{log.time}</span>
                  </div>
                  <div>{log.text}</div>
                </div>
              ))
            )}
          </div>

          {/* In-Game Chat Form */}
          <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-800 flex gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="پیام یا رجزخوانی به حریف..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-500 disabled:opacity-40 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

