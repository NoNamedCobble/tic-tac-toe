import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlayerWithoutSymbol } from 'src/types';
import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerSymbol, Room } from '../types';

@Injectable()
export class RoomsService {
  readonly MAX_PLAYERS = 2;
  private rooms: Map<string, Room> = new Map();

  createRoom() {
    const roomId = uuidv4();
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

    const symbol: PlayerSymbol = room.players.length ? 'X' : 'O';

    const player: Player = {
      ...playerWithoutSymbol,
      symbol,
    };

    room.players.push(player);

    const players = room.players.map(({ name, symbol }) => ({
      name,
      symbol,
    }));

    return {
      roomId,
      players,
    };
  }

  removePlayerFromRoom(roomId: string, playerId: string) {
    const room = this.getRoomById(roomId);

    room.players = room.players.filter((player) => player.id !== playerId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }
}
