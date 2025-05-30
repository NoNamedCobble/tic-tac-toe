export type PlayerSymbol = 'X' | 'O';

export interface Player {
  id: string;
  name: string;
  symbol: PlayerSymbol;
}

export type PlayerWithoutSymbol = Omit<Player, 'symbol'>;

export type PlayerWithoutId = Omit<Player, 'id'>;

export type Board = (PlayerSymbol | null)[];

export interface GameState {
  board: Board;
  currentTurn: PlayerSymbol;
  winner: PlayerWithoutId | 'draw' | null;
}

export interface Room {
  players: Player[];
  maxPlayers: number;
  gameState: GameState;
}
