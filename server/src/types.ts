export type PlayerSymbol = 'X' | 'O';

export interface Player {
  id: string;
  name: string;
  symbol: PlayerSymbol;
}

export type PlayerWithoutSymbol = Omit<Player, 'symbol'>;

export interface GameState {
  board: (PlayerSymbol | null)[];
  currentTurn: PlayerSymbol;
  winner: Player | 'draw' | null;
}

export interface Room {
  players: Player[];
  maxPlayers: number;
  gameState: GameState;
}
