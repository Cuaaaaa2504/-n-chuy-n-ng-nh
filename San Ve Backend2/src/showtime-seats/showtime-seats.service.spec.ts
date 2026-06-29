import { Test, TestingModule } from '@nestjs/testing';
import { ShowtimeSeatsService } from './showtime-seats.service';

describe('ShowtimeSeatsService', () => {
  let service: ShowtimeSeatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShowtimeSeatsService],
    }).compile();

    service = module.get<ShowtimeSeatsService>(ShowtimeSeatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
