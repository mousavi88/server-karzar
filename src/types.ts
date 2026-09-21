export interface ServerStatus {
  status: string;
  name: string;
  activeRooms: number;
  connectedClients: number;
  uptimeSeconds: number;
  timestamp: number;
}

export interface OpenRoom {
  roomCode: string;
  roomTitle: string;
  creatorName: string;
  playerCount: number;
  statusFa: string;
}

export interface ActiveRoom {
  roomCode: string;
  roomTitle: string;
  creatorName: string;
  player2Name: string;
  player1Hero: string;
  player2Hero: string;
  currentRound: number;
}

export interface RoomListPayload {
  openRooms: OpenRoom[];
  activeRooms: ActiveRoom[];
}

export type PlayerId = 1 | 2;

export interface HeroCard {
  id: string;
  name: string;
  title: string;
  power: number;
  defense: number;
  type: 'warrior' | 'mythical' | 'tactic';
  description: string;
  iconName: string;
}

export interface WsMessage {
  direction: 'in' | 'out';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface GameState {
  roomCode: string | null;
  roomTitle: string;
  myPlayerId: PlayerId | null;
  myName: string;
  myHero: string | null;
  opponentName: string | null;
  opponentHero: string | null;
  currentTurn: PlayerId;
  currentRound: number;
  p1Health: number;
  p2Health: number;
  p1Dice: number | null;
  p2Dice: number | null;
  gameStarted: boolean;
  winner: PlayerId | null;
  battleLog: Array<{
    id: string;
    text: string;
    sender: 'p1' | 'p2' | 'system';
    time: string;
  }>;
}

