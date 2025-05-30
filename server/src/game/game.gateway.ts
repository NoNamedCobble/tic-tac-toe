import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from 'src/rooms/rooms.service';

@WebSocketGateway()
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody()
    data: { roomId: string; name: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const newPlayer = {
        name: data.name,
        id: client.id,
      };

      const { symbol } = this.roomsService.addPlayerToRoom(
        data.roomId,
        newPlayer,
      );
      client.join(data.roomId);

      // existing opponent in room
      const opponent = this.roomsService.getOpponent(data.roomId, client.id);

      const opponentWithoutId = opponent
        ? {
            symbol: opponent.symbol,
            name: opponent.name,
          }
        : undefined;

      client.emit('joinSuccess', {
        symbol,
        opponnent: opponentWithoutId,
      });

      const newPlayerWithoutId = {
        name: data.name,
        symbol: symbol,
      };

      // if oponnent exists in the room then notify him that a new player joined
      if (opponent) {
        client.to(data.roomId).emit('opponentJoined', {
          opponent: newPlayerWithoutId,
        });
      }
    } catch (error) {
      client.emit('joinError', { message: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    const roomId = this.roomsService.getRoomIdByPlayerId(client.id);

    if (roomId) {
      this.roomsService.removePlayerFromRoom(roomId, client.id);
      client.to(roomId).emit('opponentLeft');

      const room = this.roomsService.getRoomById(roomId);
      if (room.players.length === 0) {
        this.roomsService.deleteRoom(roomId);
      }
    }
  }
}
