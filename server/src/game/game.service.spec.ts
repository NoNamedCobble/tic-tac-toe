import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { RoomsService } from 'src/rooms/rooms.service';
import { Board, GameState, PlayerSymbol } from 'src/types';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;
  let mockGameState: GameState;

  const mockRoomsService = {
    getRoomById: jest.fn(),
    isRoomFull: jest.fn(),
    getPlayer: jest.fn(),
  };
  const roomId = 'mockedRoomId';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    mockGameState = {
      currentTurn: 'X',
      board: Array(9).fill(null),
      winner: null,
    };

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGameState', () => {
    it('should return the game state from the room', () => {
      mockRoomsService.getRoomById.mockReturnValue({
        gameState: mockGameState,
      });

      const result = service.getGameState(roomId);

      expect(mockRoomsService.getRoomById).toHaveBeenCalledWith(roomId);
      expect(result).toEqual(mockGameState);
    });
  });

  describe('makeMove', () => {
    it('should throw WsException if room is not full', () => {
      const currentPlayerId = 'player1';
      const position = 0;

      mockRoomsService.isRoomFull.mockReturnValue(false);

      expect(() => service.makeMove(roomId, currentPlayerId, position)).toThrow(
        'You need two players to start the game.',
      );
    });

    it('should update board and change turn when move is valid', () => {
      const mockGameState = {
        board: Array(9).fill(null),
        currentTurn: 'X',
        winner: null,
      };

      mockRoomsService.isRoomFull.mockReturnValue(true);
      mockRoomsService.getPlayer.mockReturnValue({
        symbol: 'X',
        name: 'Player 1',
      });
      mockRoomsService.getRoomById.mockReturnValue({
        gameState: mockGameState,
      });

      service.makeMove(roomId, 'player1', 0);

      expect(mockGameState.board[0]).toBe('X');
      expect(mockGameState.currentTurn).toBe('O');
    });

    it('should set winner and reset game if it is a winner', () => {
      mockRoomsService.isRoomFull.mockReturnValue(true);
      mockRoomsService.getPlayer.mockReturnValue({
        symbol: 'X',
        name: 'Player 1',
      });
      mockRoomsService.getRoomById.mockReturnValue({
        gameState: mockGameState,
      });

      service.checkWinner = (_board: Board): _board is PlayerSymbol[] => true;
      service.getClearBoard = () => Array(9).fill(null);
      service.getRandomStaringSymbol = () => 'O';

      const result = service.makeMove('room1', 'player1', 2);

      expect(result.winner).toEqual({ name: 'Player 1', symbol: 'X' });
      expect(result.board).toEqual(Array(9).fill(null));
      expect(result.currentTurn).toBe('O');
    });

    it('should set winner to "draw" and reset game if it is a draw', () => {
      mockRoomsService.isRoomFull.mockReturnValue(true);
      mockRoomsService.getPlayer.mockReturnValue({
        symbol: 'X',
        name: 'Player 1',
      });
      mockRoomsService.getRoomById.mockReturnValue({
        gameState: mockGameState,
      });

      mockGameState.board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', null, 'O'];

      const updatedState = service.makeMove(roomId, 'player1', 7);

      expect(updatedState.winner).toEqual('draw');
      expect(updatedState.board.every((cell) => cell === null)).toBe(true);
    });
  });

  describe('validateMove', () => {
    it('should throw WsException if position is less than 0 and grater than 8', () => {
      expect(() => service.validateMove(mockGameState, 'X', -1)).toThrow(
        new WsException('Invalid position.'),
      );

      expect(() => service.validateMove(mockGameState, 'X', 9)).toThrow(
        new WsException('Invalid position.'),
      );
    });

    it("should throw WsException if it is not the player's turn", () => {
      expect(() => service.validateMove(mockGameState, 'O', 1)).toThrow(
        new WsException("It's not your turn."),
      );
    });

    it('should throw WsException if the field is already occupied', () => {
      mockGameState.board[3] = 'O';

      expect(() => service.validateMove(mockGameState, 'X', 3)).toThrow(
        new WsException('Field is already occupied.'),
      );
    });
  });

  describe('checkWinner', () => {
    it('should return true if there is a winning row', () => {
      const winningBoard: Board = [
        'X',
        'X',
        'X',
        null,
        null,
        null,
        null,
        null,
        null,
      ];
      expect(service.checkWinner(winningBoard)).toBe(true);
    });

    it('should return true if there is a winning column', () => {
      const winningBoard: Board = [
        'O',
        null,
        null,
        'O',
        null,
        null,
        'O',
        null,
        null,
      ];
      expect(service.checkWinner(winningBoard)).toBe(true);
    });

    it('should return true if there is a winning diagonal', () => {
      const winningBoard: Board = [
        'X',
        null,
        null,
        null,
        'X',
        null,
        null,
        null,
        'X',
      ];
      expect(service.checkWinner(winningBoard)).toBe(true);
    });

    it('should return false if there is no winner', () => {
      const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
      expect(service.checkWinner(board)).toBe(false);
    });
  });

  describe('isDraw', () => {
    it('should return true if all field are filled', () => {
      const drawBoard: Board = ['O', 'X', 'O', 'X', 'O', 'X', 'O', 'X', 'O'];
      expect(service.isDraw(drawBoard)).toBe(true);
    });

    it('should return false if there are empty fields', () => {
      const incompleteBoard: Board = [
        'X',
        'O',
        null,
        'X',
        'O',
        'O',
        'O',
        'X',
        'X',
      ];
      expect(service.isDraw(incompleteBoard)).toBe(false);
    });
  });

  describe('resetGame', () => {
    it('should reset the board and set new currentTurn', () => {
      service.getClearBoard = () => Array(9).fill(null);
      service.getRandomStaringSymbol = () => 'O';

      service.resetGame(mockGameState);

      expect(mockGameState.board).toEqual(Array(9).fill(null));
      expect(mockGameState.currentTurn).toBe('O');
    });
  });

  describe('resetGameByRoomId', () => {
    it('should reset the game state', () => {
      const mockGameState: GameState = {
        board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
        currentTurn: 'X',
        winner: null,
      };

      const expectedBoard = Array(9).fill(null);
      const expectedTurn = 'O';

      service.getGameState = () => mockGameState;

      service.getClearBoard = () => expectedBoard;
      service.getRandomStaringSymbol = () => expectedTurn;

      const result = service.resetGameByRoomId(roomId);

      expect(result.board).toEqual(expectedBoard);
      expect(result.currentTurn).toBe(expectedTurn);
    });
  });

  describe('getNextTurn', () => {
    it('should return "O" if current turn is "X"', () => {
      expect(service.getNextTurn('X')).toBe('O');
    });

    it('should return "X" if current turn is "O"', () => {
      expect(service.getNextTurn('O')).toBe('X');
    });
  });
});
