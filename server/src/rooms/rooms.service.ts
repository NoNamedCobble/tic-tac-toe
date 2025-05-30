import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlayerWithoutSymbol } from 'src/types';
import { Player, PlayerSymbol, Room } from '../types';

@Injectable()
export class RoomsService {
  readonly MAX_PLAYERS = 2;
  private rooms: Map<string, Room> = new Map();

  createRoom() {
    const roomId = 'test'; //uuidv4();
    const room: Room = {
      players: [],
      maxPlayers: this.MAX_PLAYERS,
      gameState: {
        board: Array(9).fill(null),
        currentTurn: 'X',
        winner: null,
      },
    };
    this.rooms.set(roomId, room);
    return { roomId };
  }

  getRoomById(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    return room;
  }

  isRoomFull(roomId: string) {
    const room = this.getRoomById(roomId);

    return room.players.length >= room.maxPlayers;
  }

  addPlayerToRoom(roomId: string, playerWithoutSymbol: PlayerWithoutSymbol) {
    const room = this.getRoomById(roomId);

    if (this.isRoomFull(roomId)) {
      throw new BadRequestException('Room is full.');
    }

    if (room.players.find((player) => player.id === playerWithoutSymbol.id)) {
      throw new BadRequestException('Player already joined the room.');
    }

    const symbol: PlayerSymbol = room.players[0]?.symbol === 'O' ? 'X' : 'O';

    const player: Player = {
      ...playerWithoutSymbol,
      symbol,
    };

    room.players.push(player);

    return player;
  }

  removePlayerFromRoom(roomId: string, playerId: string) {
    const room = this.getRoomById(roomId);

    room.players = room.players.filter((player) => player.id !== playerId);
  }

  deleteRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  getPlayers(roomId: string) {
    const room = this.getRoomById(roomId);
    return room.players;
  }

  getPlayersWithoutId(roomId: string) {
    const players = this.getPlayers(roomId);
    return players.map(({ name, symbol }) => ({
      name,
      symbol,
    }));
  }

  getRoomIdByPlayerId(playerId: string) {
    for (const [roomId, room] of this.rooms.entries()) {
      const isPlayerInRoom = room.players.some(
        (player) => player.id === playerId,
      );

      if (isPlayerInRoom) {
        return roomId;
      }
    }
  }

  getOpponent(roomId: string, currentPlayerId: string) {
    const players = this.getPlayers(roomId);
    return players.find((player) => player.id !== currentPlayerId);
  }
}
