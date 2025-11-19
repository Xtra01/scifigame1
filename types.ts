
export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER',
  COOP_LOCAL = 'COOP_LOCAL' // Hotseat mode
}

export enum GameState {
  MENU = 'MENU',
  SHIP_SELECT = 'SHIP_SELECT',
  LOADING_EVENT = 'LOADING_EVENT',
  PLAYING_EVENT = 'PLAYING_EVENT',
  CINEMATIC = 'CINEMATIC', // New: Pre-combat cutscene
  MINIGAME = 'MINIGAME', // Action Phase
  RESOLVING = 'RESOLVING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY' // Now represents retiring or distinct endings, not just turn limit
}

export interface Resources {
  hull: number;
  energy: number;
  crew: number;
  credits: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
}

export interface ShipClass {
  id: string;
  name: string;
  description: string;
  bonus: string;
  initialResources: Resources;
}

export interface Choice {
  id: string;
  text: string;
  type: 'aggressive' | 'diplomatic' | 'scientific' | 'evasive';
  risk: 'low' | 'medium' | 'high' | 'extreme';
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
}

export interface CombatDetails {
  enemyName: string;
  enemyClass: string;
  description: string;
  weakness: string;
  threatLevel: 'LOW' | 'MODERATE' | 'CRITICAL' | 'EXTREME';
}

export interface Resolution {
  outcomeText: string;
  resourceChanges: Partial<Resources>;
  itemReward?: Item | null; // New: Loot system
  success: boolean;
}

export interface LogEntry {
  turn: number;
  message: string;
  type: 'info' | 'danger' | 'success' | 'warning' | 'item';
}

export interface PlayerState {
  resources: Resources;
  inventory: Item[];
  turn: number;
  gameMode: GameMode;
  currentPlayer: 1 | 2;
  shipClass: ShipClass | null;
  difficultyMultiplier: number; // Scales with turns
}

export interface MinigameConfig {
  type: 'combat' | 'dodge' | 'hacking';
  difficulty: number; // 1-5 based on risk, scales infinitely
}

export interface MinigameResult {
  success: boolean;
  hullDamageTaken: number;
  score: number;
}

// AI Service Types
export interface AIEventResponse {
  title: string;
  description: string;
  choices: {
    text: string;
    type: string;
    risk: string;
  }[];
}
