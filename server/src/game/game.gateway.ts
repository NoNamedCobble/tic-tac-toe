import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from 'src/rooms/rooms.service';
import { GameService } from './game.service';

@WebSocketGateway()
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
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

        this.server
          .to(data.roomId)
          .emit('gameStarted', this.gameService.getGameState(data.roomId));
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

      if (this.roomsService.isRoomEmpty(roomId)) {
        this.roomsService.deleteRoom(roomId);
      }

      const gameState = this.gameService.resetGameByRoomId(roomId);

      this.server.to(roomId).emit('gameStateUpdated', gameState);
    }
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(
    @MessageBody() data: { position: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomId = this.roomsService.getRoomIdByPlayerId(client.id);

      const updatedGameState = this.gameService.makeMove(
        roomId,
        client.id,
        data.position,
      );

      this.server.to(roomId).emit('gameStateUpdated', updatedGameState);
    } catch (error) {
      client.emit('makeMoveError', { message: error.message });
    }
  }
}
