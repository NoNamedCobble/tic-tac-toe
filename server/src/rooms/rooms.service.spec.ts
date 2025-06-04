import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomId: string;

  const player1 = { id: 'player1', name: 'Player 1' };
  const player2 = { id: 'player2', name: 'Player 2' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomId = service.createRoom().roomId;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should return an object with roomId as string', () => {
      const result = service.createRoom();
      expect(result).toHaveProperty('roomId');
      expect(typeof result.roomId).toBe('string');
    });

    it('should add a new room to the rooms map', () => {
      const result = service.createRoom();
      expect(service.getRoomById(result.roomId)).toBeDefined();
    });

    it('should create a room with the correct initial state', () => {
      const room = service.getRoomById(roomId);
      expect(room.players.length).toEqual(0);
      expect(room.maxPlayers).toBe(service.MAX_PLAYERS);
      expect(room.gameState.board).toEqual(Array(9).fill(null));
      expect(room.gameState.currentTurn).toBe('X');
      expect(room.gameState.winner).toBeNull();
    });
  });

  describe('getRoomById', () => {
    it('should return the room if it exists', () => {
      expect(service.getRoomById(roomId)).toBeDefined();
    });

    it('should throw WsException if room does not exist', () => {
      expect(() => service.getRoomById('nonExistingRoomId')).toThrow(
        new WsException('Room not found.'),
      );
    });
  });

  describe('isRoomFull', () => {
    it('should return true if room is full', () => {
      service.addPlayerToRoom(roomId, player1);
      service.addPlayerToRoom(roomId, player2);
      expect(service.isRoomFull(roomId)).toBe(true);
    });

    it('should return false if room is not full', () => {
      service.addPlayerToRoom(roomId, player1);
      expect(service.isRoomFull(roomId)).toBe(false);
    });
  });

  describe('addPlayerToRoom', () => {
    it('should add player to room', () => {
      const added = service.addPlayerToRoom(roomId, player1);
      const roomPlayers = service.getRoomById(roomId).players;
      expect(roomPlayers[0]).toEqual({ symbol: added.symbol, ...player1 });
    });

    it('should return player with name and symbol', () => {
      const added = service.addPlayerToRoom(roomId, player1);
      expect(added.name).toBe(player1.name);
      expect(['X', 'O']).toContain(added.symbol);
    });

    it('should throw if room is full', () => {
      service.addPlayerToRoom(roomId, player1);
      service.addPlayerToRoom(roomId, player2);
      expect(() =>
        service.addPlayerToRoom(roomId, { id: '3', name: 'Player 3' }),
      ).toThrow(new WsException('Room is full.'));
    });

    it('should throw if player already joined', () => {
      service.addPlayerToRoom(roomId, player1);
      expect(() => service.addPlayerToRoom(roomId, player1)).toThrow(
        new WsException('Player already joined the room.'),
      );
    });
  });

  describe('removePlayerFromRoom', () => {
    it('should remove player from room', () => {
      service.addPlayerToRoom(roomId, player1);
      service.removePlayerFromRoom(roomId, player1.id);
      expect(service.isRoomEmpty(roomId)).toBe(true);
    });
  });

  describe('deleteRoom', () => {
    it('should delete the room', () => {
      service.deleteRoom(roomId);
      expect(() => service.getRoomById(roomId)).toThrow(
        new WsException('Room not found.'),
      );
    });
  });

  describe('getPlayers', () => {
    it('should return array of players with symbol, id and name', () => {
      service.addPlayerToRoom(roomId, player1);
      service.addPlayerToRoom(roomId, player2);
      const players = service.getPlayers(roomId);

      expect(Array.isArray(players)).toBe(true);
      players.forEach((p) => {
        expect(typeof p.id).toBe('string');
        expect(typeof p.name).toBe('string');
        expect(['X', 'O']).toContain(p.symbol);
      });
    });
  });

  describe('getPlayersWithoutId', () => {
    it('should return players without id', () => {
      service.addPlayerToRoom(roomId, player1);
      service.addPlayerToRoom(roomId, player2);
      const players = service.getPlayersWithoutId(roomId);

      expect(Array.isArray(players)).toBe(true);
      players.forEach((p) => {
        expect(p).not.toHaveProperty('id');
        expect(typeof p.name).toBe('string');
        expect(['X', 'O']).toContain(p.symbol);
      });
    });
  });

  describe('getRoomIdByPlayerId', () => {
    it('should return correct roomId', () => {
      const added = service.addPlayerToRoom(roomId, player1);
      expect(service.getRoomIdByPlayerId(added.id)).toBe(roomId);
    });

    it('should throw if player not in any room', () => {
      expect(() => service.getRoomIdByPlayerId('unknown')).toThrow(
        new WsException('Player not found in any room.'),
      );
    });
  });

  describe('getOpponent', () => {
    it('should return opponent of player', () => {
      service.addPlayerToRoom(roomId, player1);
      const added2 = service.addPlayerToRoom(roomId, player2);

      const opponent = service.getOpponent(roomId, player1.id);
      expect(opponent).toEqual({
        symbol: added2.symbol,
        name: player2.name,
        id: player2.id,
      });
    });

    it('should return undefined if no opponent', () => {
      service.addPlayerToRoom(roomId, player1);
      expect(service.getOpponent(roomId, player1.id)).toBeUndefined();
    });
  });

  describe('getPlayer', () => {
    it('should return player by ID', () => {
      service.addPlayerToRoom(roomId, player1);
      const result = service.getPlayer(roomId, player1.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('symbol');
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.symbol).toBe('string');
    });

    it('should throw if player not found', () => {
      expect(() => service.getPlayer(roomId, 'unknown')).toThrow(
        new WsException('Player not found in room.'),
      );
    });
  });

  describe('isRoomEmpty', () => {
    it('should return true if room is empty', () => {
      expect(service.isRoomEmpty(roomId)).toBe(true);
    });

    it('should return false if room has players', () => {
      service.addPlayerToRoom(roomId, player1);
      expect(service.isRoomEmpty(roomId)).toBe(false);
    });
  });
});
