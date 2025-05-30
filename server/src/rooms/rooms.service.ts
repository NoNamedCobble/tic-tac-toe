import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PlayerSymbol, PlayerWithoutSymbol } from 'src/types';
import { Room } from '../types';

@Injectable()
export class RoomsService {
  readonly MAX_PLAYERS = 2;
  private rooms: Map<string, Room> = new Map();

  createRoom() {
    const roomId = 'test'; // uuidv4();
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
      throw new WsException('Room not found.');
    }
    return room;
  }

  isRoomFull(roomId: string) {
    const room = this.getRoomById(roomId);
    return room.players.length >= room.maxPlayers;
  }

  addPlayerToRoom(roomId: string, playerWithoutSymbol: PlayerWithoutSymbol) {
    const room = this.getRoomById(roomId);

    if (room.players.find((player) => player.id === playerWithoutSymbol.id)) {
      throw new WsException('Player already joined the room.');
    }

    if (this.isRoomFull(roomId)) {
      throw new WsException('Room is full.');
    }

    const symbol: PlayerSymbol = room.players[0]?.symbol === 'O' ? 'X' : 'O';

    const player = {
      ...playerWithoutSymbol,
      symbol,
    };

    room.players.push(player);

    return player;
  }

  removePlayerFromRoom(roomId: string, currentPlayerId: string) {
    const room = this.getRoomById(roomId);

    room.players = room.players.filter(
      (player) => player.id !== currentPlayerId,
    );
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

  getRoomIdByPlayerId(playerId: string): string {
    for (const [roomId, room] of this.rooms.entries()) {
      const isPlayerInRoom = room.players.some(
        (player) => player.id === playerId,
      );

      if (isPlayerInRoom) {
        return roomId;
      }
    }
    throw new WsException('Player not found in any room.');
  }

  getOpponent(roomId: string, currentPlayerId: string) {
    const players = this.getPlayers(roomId);
    return players.find((player) => player.id !== currentPlayerId);
  }

  getPlayer(roomId: string, currentPlayerId: string) {
    const players = this.getPlayers(roomId);
    const player = players.find((player) => player.id === currentPlayerId);
    if (!player) {
      throw new WsException('Player not found in room.');
    }
    return player;
  }

  isRoomEmpty(roomId: string) {
    const players = this.getPlayers(roomId);
    return players.length === 0;
  }
}
