import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: RoomsService;

  const mockRoomsService = {
    createRoom: jest.fn().mockReturnValue({ roomId: 'mockedRoomId' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call roomsService.createRoom and return object with roomId', () => {
      const result = controller.create();
      expect(service.createRoom).toHaveBeenCalled();
      const expectedResult = mockRoomsService.createRoom();
      expect(result).toEqual(expectedResult);
    });
  });
});
