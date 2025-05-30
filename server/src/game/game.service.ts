import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RoomsService } from 'src/rooms/rooms.service';
import { Board, GameState, PlayerSymbol } from 'src/types';

@Injectable()
export class GameService {
  constructor(private readonly roomsService: RoomsService) {}

  getGameState(roomId: string) {
    const { gameState } = this.roomsService.getRoomById(roomId);
    return gameState;
  }

  makeMove(roomId: string, currentPlayerId: string, position: number) {
    const isRoomFull = this.roomsService.isRoomFull(roomId);
    if (!isRoomFull) {
      throw new WsException('You need two players to start the game.');
    }

    const { symbol, name } = this.roomsService.getPlayer(
      roomId,
      currentPlayerId,
    );
    const gameState = this.getGameState(roomId);
    this.validateMove(gameState, symbol, position);

    gameState.board[position] = symbol;
    gameState.currentTurn = this.getNextTurn(symbol);

    const hasWinner = this.checkWinner(gameState.board);

    if (hasWinner) {
      const winner = { name, symbol };
      gameState.winner = winner;
      this.resetGame(gameState);
    } else if (this.isDraw(gameState.board)) {
      gameState.winner = 'draw';
      this.resetGame(gameState);
    }

    return gameState;
  }

  validateMove(gameState: GameState, symbol: PlayerSymbol, position: number) {
    if (gameState.currentTurn !== symbol) {
      throw new WsException("It's not your turn.");
    }

    if (position < 0 || position > 8) {
      throw new WsException('Invalid position.');
    }

    if (gameState.board[position] !== null) {
      throw new WsException('Field is already occupied.');
    }
  }

  checkWinner(board: Board) {
    const winningLines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    return winningLines.some(
      ([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c],
    );
  }

  getClearBoard() {
    return Array(9).fill(null);
  }

  getRandomStaringSymbol() {
    return Math.random() < 0.5 ? 'X' : 'O';
  }

  isDraw(board: Board) {
    return board.every((field) => field !== null);
  }

  resetGame(gameState: GameState) {
    gameState.board = this.getClearBoard();
    gameState.currentTurn = this.getRandomStaringSymbol();
  }

  resetGameByRoomId(roomId: string) {
    const gameState = this.getGameState(roomId);
    this.resetGame(gameState);
    return gameState;
  }

  getNextTurn(currentSymbol: string): PlayerSymbol {
    return currentSymbol === 'X' ? 'O' : 'X';
  }
}
