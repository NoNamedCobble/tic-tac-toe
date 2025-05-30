import { Injectable } from '@nestjs/common';
import { RoomsService } from 'src/rooms/rooms.service';

@Injectable()
export class GameService {
  constructor(private readonly roomsService: RoomsService) {}

  getGameState(roomId: string) {
    const room = this.roomsService.getRoomById(roomId);
    return room.gameState;
  }
}
