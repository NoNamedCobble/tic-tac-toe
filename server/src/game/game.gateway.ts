import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from 'src/rooms/rooms.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { MakeMoveDto } from './dto/make-move.dto';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@UsePipes(new ValidationPipe({ whitelist: true }))
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
    dto: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const newPlayer = {
        name: dto.name,
        id: client.id,
      };

      const { symbol } = this.roomsService.addPlayerToRoom(
        dto.roomId,
        newPlayer,
      );
      client.join(dto.roomId);

      // existing opponent in room
      const opponent = this.roomsService.getOpponent(dto.roomId, client.id);

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
        name: dto.name,
        symbol: symbol,
      };

      // if oponnent exists in the room then notify him that a new player joined
      if (opponent) {
        client.to(dto.roomId).emit('opponentJoined', {
          opponent: newPlayerWithoutId,
        });

        this.server
          .to(dto.roomId)
          .emit('gameStarted', this.gameService.getGameState(dto.roomId));
      }
    } catch (error) {
      client.emit('joinError', { message: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const roomId = this.roomsService.getRoomIdByPlayerId(client.id);

      if (roomId) {
        this.roomsService.removePlayerFromRoom(roomId, client.id);
        client.to(roomId).emit('opponentLeft');

        const gameState = this.gameService.resetGameByRoomId(roomId);
        if (this.roomsService.isRoomEmpty(roomId)) {
          this.roomsService.deleteRoom(roomId);
        }

        this.server.to(roomId).emit('gameStateUpdated', gameState);
      }
    } catch (error) {
      console.log('disconnectError', error);
    }
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(
    @MessageBody() dto: MakeMoveDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomId = this.roomsService.getRoomIdByPlayerId(client.id);

      const updatedGameState = this.gameService.makeMove(
        roomId,
        client.id,
        dto.position,
      );

      this.server.to(roomId).emit('gameStateUpdated', updatedGameState);
    } catch (error) {
      client.emit('makeMoveError', { message: error.message });
    }
  }
}
