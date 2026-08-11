import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { ShowtimeSeatsService } from '../src/showtime-seats/showtime-seats.service';

type AsyncCallback = (...args: any[]) => Promise<any>;

function createQueryBuilderMock(affected: number) {
  const queryBuilder: any = {};

  queryBuilder.update = () => queryBuilder;
  queryBuilder.set = () => queryBuilder;
  queryBuilder.where = () => queryBuilder;
  queryBuilder.andWhere = () => queryBuilder;
  queryBuilder.execute = async () => ({ affected });

  return queryBuilder;
}

function createService() {
  const showtimeSeatRepository = {
    find: async () => [],
  };

  const seatHoldRepository = {};

  const showtimeRepository = {
    findOne: async () => null,
  };

  const seatHoldService: any = {
    holdSingleSeat: async () => null,
    holdMultipleSeats: async () => null,
    getUserHolds: async () => [],
    getHoldDetails: async () => null,
    releaseHold: async () => undefined,
  };

  const dataSource: any = {
    query: async () => [],
    transaction: async (callback: AsyncCallback) => {
      return callback({
        createQueryBuilder: () => createQueryBuilderMock(0),
      });
    },
  };

  const service = new ShowtimeSeatsService(
    showtimeSeatRepository as any,
    seatHoldRepository as any,
    showtimeRepository as any,
    seatHoldService as any,
    dataSource as any,
  );

  return {
    service,
    showtimeSeatRepository,
    showtimeRepository,
    seatHoldService,
    dataSource,
  };
}

test('getHello trả về trạng thái module hoạt động', async () => {
  const { service } = createService();

  const result = await service.getHello();

  assert.deepEqual(result, {
    message: 'showtime-seats module ok',
  });
});

test('getSeatMap báo lỗi khi suất chiếu không tồn tại', async () => {
  const { service, showtimeRepository } = createService();

  showtimeRepository.findOne = async () => null;

  await assert.rejects(
    () => service.getSeatMap(999),
    (error: unknown) =>
      error instanceof NotFoundException &&
      error.message.includes('Không tìm thấy suất chiếu #999'),
  );
});

test('getSeatMap trả đúng thông tin suất chiếu và ghế', async () => {
  const {
    service,
    showtimeRepository,
    showtimeSeatRepository,
    dataSource,
  } = createService();

  const startTime = new Date('2026-08-07T12:00:00.000Z');
  const endTime = new Date('2026-08-07T14:00:00.000Z');

  showtimeRepository.findOne = async () =>
    ({
      showtimeId: 10,
      startTime,
      endTime,
      room: {
        roomName: 'Phòng 01',
        cinema: {
          cinemaName: 'CMC Cinema',
        },
      },
    }) as any;

  showtimeSeatRepository.find = async () =>
    [
      {
        showtimeSeatId: 101,
        showtimeId: 10,
        seatId: 1,
        status: 'AVAILABLE',
        price: '85000',
        heldByUserId: null,
        holdExpiresAt: null,
        seat: {
          seatRow: 'A',
          seatNumber: 1,
          seatLabel: 'A1',
          seatTypeId: 1,
          seatType: {
            typeCode: 'STANDARD',
            typeName: 'Ghế thường',
          },
        },
      },
    ] as any;

  dataSource.query = async () => [
    {
      title: 'Dune: Part Two',
    },
  ];

  const result = await service.getSeatMap(10);

  assert.equal(result.showtimeId, 10);
  assert.equal(result.movieTitle, 'Dune: Part Two');
  assert.equal(result.cinemaName, 'CMC Cinema');
  assert.equal(result.roomName, 'Phòng 01');
  assert.equal(result.totalSeats, 1);
  assert.equal(result.seatsGenerated, true);

  assert.equal(result.seats[0].showtimeSeatId, 101);
  assert.equal(result.seats[0].seatLabel, 'A1');
  assert.equal(result.seats[0].seatRow, 'A');
  assert.equal(result.seats[0].seatTypeCode, 'STANDARD');
  assert.equal(result.seats[0].seatStatus, 'AVAILABLE');
  assert.equal(result.seats[0].price, 85000);
});

test('holdSeat chuyển đúng userId và DTO sang SeatHoldService', async () => {
  const { service, seatHoldService } = createService();

  let receivedUserId: number | undefined;
  let receivedDto: unknown;

  seatHoldService.holdSingleSeat = async (
    userId: number,
    dto: unknown,
  ) => {
    receivedUserId = userId;
    receivedDto = dto;

    return {
      holdId: 20,
      status: 'ACTIVE',
    };
  };

  const dto = {
    showtimeSeatId: 101,
    holdMinutes: 10,
  };

  const result = await service.holdSeat(5, dto as any);

  assert.equal(receivedUserId, 5);
  assert.deepEqual(receivedDto, dto);

  assert.deepEqual(result, {
    holdId: 20,
    status: 'ACTIVE',
  });
});

test('holdManySeats chuyển đúng danh sách ghế', async () => {
  const { service, seatHoldService } = createService();

  let receivedUserId: number | undefined;
  let receivedPayload: unknown;

  seatHoldService.holdMultipleSeats = async (
    userId: number,
    payload: unknown,
  ) => {
    receivedUserId = userId;
    receivedPayload = payload;

    return {
      holdId: 21,
      seatCount: 2,
    };
  };

  const dto = {
    showtimeSeatIds: [101, 102],
    holdMinutes: 10,
  };

  const result = await service.holdManySeats(5, dto as any);

  assert.equal(receivedUserId, 5);

  assert.deepEqual(receivedPayload, {
    showtimeSeatIds: [101, 102],
    holdMinutes: 10,
  });

  assert.deepEqual(result, {
    holdId: 21,
    seatCount: 2,
  });
});

test('releaseHold giải phóng đúng hold của người dùng', async () => {
  const { service, seatHoldService } = createService();

  let receivedHoldId: string | undefined;
  let receivedUserId: number | undefined;

  seatHoldService.releaseHold = async (
    holdId: string,
    userId: number,
  ) => {
    receivedHoldId = holdId;
    receivedUserId = userId;
  };

  const result = await service.releaseHold(5, 99);

  assert.equal(receivedHoldId, '99');
  assert.equal(receivedUserId, 5);

  assert.deepEqual(result, {
    message: 'Release hold thành công',
    holdId: 99,
  });
});

test('expireSeatHolds dùng stored procedure khi chạy thành công', async () => {
  const { service, dataSource } = createService();

  let executedSql = '';

  dataSource.query = async (sql: string) => {
    executedSql = sql;
    return [];
  };

  const result = await service.expireSeatHolds();

  assert.equal(executedSql, 'EXEC sp_release_expired_holds');

  assert.deepEqual(result, {
    message: 'Expired seat holds released',
    strategy: 'stored-procedure',
  });
});

test('expireSeatHolds dùng fallback khi stored procedure chưa tồn tại', async () => {
  const { service, dataSource } = createService();

  const sqlError = Object.assign(
    new Error('Could not find stored procedure sp_release_expired_holds'),
    {
      number: 2812,
    },
  );

  dataSource.query = async () => {
    throw sqlError;
  };

  const affectedResults = [2, 1];

  dataSource.transaction = async (callback: AsyncCallback) => {
    const manager = {
      createQueryBuilder: () => {
        const affected = affectedResults.shift() ?? 0;
        return createQueryBuilderMock(affected);
      },
    };

    return callback(manager);
  };

  const result = await service.expireSeatHolds();

  assert.deepEqual(result, {
    message: 'Expired seat holds released (fallback)',
    strategy: 'fallback',
    releasedSeats: 2,
    expiredHolds: 1,
  });
});

test('expireSeatHolds báo lỗi khi SQL Server gặp lỗi khác', async () => {
  const { service, dataSource } = createService();

  const sqlError = Object.assign(
    new Error('SQL Server connection lost'),
    {
      number: 10054,
    },
  );

  dataSource.query = async () => {
    throw sqlError;
  };

  await assert.rejects(
    () => service.expireSeatHolds(),
    (error: unknown) =>
      error instanceof InternalServerErrorException &&
      error.message.includes('Không thể giải phóng ghế giữ hết hạn'),
  );
});
