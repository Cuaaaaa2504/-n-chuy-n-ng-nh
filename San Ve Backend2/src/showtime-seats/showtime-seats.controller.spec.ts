import { Test, TestingModule } from '@nestjs/testing';
import { ShowtimeSeatsController } from './showtime-seats.controller';

describe('ShowtimeSeatsController', () => {
  let controller: ShowtimeSeatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowtimeSeatsController],
    }).compile();

    controller = module.get<ShowtimeSeatsController>(ShowtimeSeatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
