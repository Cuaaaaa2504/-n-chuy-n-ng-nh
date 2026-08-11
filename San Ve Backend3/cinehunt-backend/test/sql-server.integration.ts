import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import 'dotenv/config';
import * as sql from 'mssql';

let pool: sql.ConnectionPool;

function readNumber(value: string | undefined, fallback: number): number {
  const normalized = value?.trim();
  if (!normalized) return fallback;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const username = process.env.DB_USERNAME ?? process.env.DB_USER;
const database = process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'CineHuntDB';

const config: sql.config = {
  server: process.env.DB_HOST ?? 'localhost',
  port: readNumber(process.env.DB_PORT, 1433),
  user: username,
  password: process.env.DB_PASSWORD,
  database,
  connectionTimeout: readNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 15_000),
  requestTimeout: readNumber(process.env.DB_REQUEST_TIMEOUT_MS, 30_000),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    ...(process.env.DB_INSTANCE
      ? { instanceName: process.env.DB_INSTANCE }
      : {}),
  },
  pool: {
    min: 0,
    max: 3,
    idleTimeoutMillis: 10_000,
  },
};

before(async () => {
  assert.ok(username, 'Thiếu DB_USERNAME hoặc DB_USER trong file .env');
  assert.ok(process.env.DB_PASSWORD, 'Thiếu DB_PASSWORD trong file .env');

  pool = await new sql.ConnectionPool(config).connect();
});

after(async () => {
  await pool?.close();
});

test('SQL Server kết nối đúng database CineHunt', async () => {
  const result = await pool.request().query<{
    databaseName: string;
    serverName: string;
  }>(`
    SELECT
      DB_NAME() AS databaseName,
      CAST(SERVERPROPERTY('ServerName') AS NVARCHAR(256)) AS serverName
  `);

  assert.equal(result.recordset.length, 1);
  assert.equal(result.recordset[0].databaseName, database);
  assert.ok(result.recordset[0].serverName);
});

test('các bảng nghiệp vụ bắt buộc đều tồn tại', async () => {
  const requiredTables = [
    'users',
    'movies',
    'showtimes',
    'showtime_seats',
    'booking_orders',
    'payments',
    'tickets',
  ];

  const result = await pool.request().query<{ name: string }>(`
    SELECT name
    FROM sys.tables
    WHERE name IN (
      'users',
      'movies',
      'showtimes',
      'showtime_seats',
      'booking_orders',
      'payments',
      'tickets'
    )
  `);

  const found = new Set(result.recordset.map((row) => row.name));
  const missing = requiredTables.filter((name) => !found.has(name));

  assert.deepEqual(
    missing,
    [],
    `Thiếu bảng trong SQL Server: ${missing.join(', ')}`,
  );
});

test('các cột cốt lõi của luồng đặt vé tồn tại', async () => {
  const result = await pool.request().query<{
    showtimeSeatStatus: number;
    holdExpiresAt: number;
    bookingStatus: number;
    paymentStatus: number;
  }>(`
    SELECT
      CASE WHEN COL_LENGTH('dbo.showtime_seats', 'status') IS NULL
        THEN 0 ELSE 1 END AS showtimeSeatStatus,
      CASE WHEN COL_LENGTH('dbo.showtime_seats', 'hold_expires_at') IS NULL
        THEN 0 ELSE 1 END AS holdExpiresAt,
      CASE WHEN COL_LENGTH('dbo.booking_orders', 'status') IS NULL
        THEN 0 ELSE 1 END AS bookingStatus,
      CASE WHEN COL_LENGTH('dbo.payments', 'payment_status') IS NULL
        THEN 0 ELSE 1 END AS paymentStatus
  `);

  assert.deepEqual(result.recordset[0], {
    showtimeSeatStatus: 1,
    holdExpiresAt: 1,
    bookingStatus: 1,
    paymentStatus: 1,
  });
});

test('stored procedure giải phóng ghế hết hạn tồn tại', async () => {
  const result = await pool.request().query<{ procedureId: number | null }>(`
    SELECT OBJECT_ID(
      'dbo.sp_release_expired_holds',
      'P'
    ) AS procedureId
  `);

  assert.ok(
    result.recordset[0].procedureId,
    'Không tìm thấy dbo.sp_release_expired_holds',
  );
});

test('đọc được dữ liệu nghiệp vụ mà không làm thay đổi database', async () => {
  const result = await pool.request().query<{
    movieCount: number;
    userCount: number;
    showtimeCount: number;
  }>(`
    SELECT
      CAST((SELECT COUNT_BIG(*) FROM dbo.movies) AS INT) AS movieCount,
      CAST((SELECT COUNT_BIG(*) FROM dbo.users) AS INT) AS userCount,
      CAST((SELECT COUNT_BIG(*) FROM dbo.showtimes) AS INT) AS showtimeCount
  `);

  const row = result.recordset[0];

  assert.ok(row.movieCount >= 0);
  assert.ok(row.userCount >= 0);
  assert.ok(row.showtimeCount >= 0);
});

test('SQL Server rollback transaction đúng và không để transaction treo', async () => {
  const result = await pool.request().query<{
    beforeRollback: number;
    afterRollback: number;
  }>(`
    BEGIN TRANSACTION;

    DECLARE @BeforeRollback INT = @@TRANCOUNT;

    ROLLBACK TRANSACTION;

    SELECT
      @BeforeRollback AS beforeRollback,
      @@TRANCOUNT AS afterRollback;
  `);

  assert.equal(result.recordset[0].beforeRollback, 1);
  assert.equal(result.recordset[0].afterRollback, 0);
});


test('stored procedure chỉ giải phóng ghế của ACTIVE hold đúng owner', async () => {
  const result = await pool.request().query<{ definition: string | null }>(`
    SELECT OBJECT_DEFINITION(
      OBJECT_ID('dbo.sp_release_expired_holds', 'P')
    ) AS definition
  `);

  const definition = String(result.recordset[0]?.definition ?? '').toLowerCase();
  assert.match(definition, /inner join dbo\.seat_holds/);
  assert.match(definition, /h\.status = 'active'/);
  assert.match(definition, /ss\.held_by_user_id = h\.user_id/);
});

test('database chỉ cho phép một PENDING payment trên mỗi booking', async () => {
  const result = await pool.request().query<{ indexCount: number }>(`
    SELECT CAST(COUNT(*) AS INT) AS indexCount
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.payments')
      AND name = 'UX_payments_one_pending_per_booking'
      AND is_unique = 1
      AND has_filter = 1
  `);

  assert.equal(result.recordset[0].indexCount, 1);
});
test('schema expiry columns khớp metadata entity', async () => {
  const result = await pool.request().query<{
    bookingExpiresNullable: number | null;
    bookingExpiresScale: number | null;
    seatHoldExpiresNullable: number | null;
    seatHoldExpiresScale: number | null;
  }>(`
    SELECT
      (
        SELECT CAST(c.is_nullable AS INT)
        FROM sys.columns AS c
        WHERE c.object_id = OBJECT_ID('dbo.booking_orders')
          AND c.name = 'expires_at'
      ) AS bookingExpiresNullable,
      (
        SELECT CAST(c.scale AS INT)
        FROM sys.columns AS c
        WHERE c.object_id = OBJECT_ID('dbo.booking_orders')
          AND c.name = 'expires_at'
      ) AS bookingExpiresScale,
      (
        SELECT CAST(c.is_nullable AS INT)
        FROM sys.columns AS c
        WHERE c.object_id = OBJECT_ID('dbo.showtime_seats')
          AND c.name = 'hold_expires_at'
      ) AS seatHoldExpiresNullable,
      (
        SELECT CAST(c.scale AS INT)
        FROM sys.columns AS c
        WHERE c.object_id = OBJECT_ID('dbo.showtime_seats')
          AND c.name = 'hold_expires_at'
      ) AS seatHoldExpiresScale
  `);

  assert.deepEqual(result.recordset[0], {
    bookingExpiresNullable: 1,
    bookingExpiresScale: 0,
    seatHoldExpiresNullable: 1,
    seatHoldExpiresScale: 0,
  });
});

test('migration concurrency quan trọng đã được áp dụng', async () => {
  const result = await pool.request().query<{ migrationCount: number }>(`
    SELECT CAST(COUNT(*) AS INT) AS migrationCount
    FROM dbo.typeorm_migrations
    WHERE name = 'HardenBookingLifecycleConcurrency1786423740000'
  `);

  assert.equal(
    result.recordset[0].migrationCount,
    1,
    'Chưa áp dụng HardenBookingLifecycleConcurrency1786423740000',
  );
});

test('critical lifecycle indexes đã được áp dụng', async () => {
  const result = await pool.request().query<{
    refundPendingIndex: number;
    bookingIdempotencyIndex: number;
    idempotencyColumn: number;
  }>(`
    SELECT
      CAST((
        SELECT COUNT(*)
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.refunds')
          AND name = 'UX_refunds_one_pending_per_booking'
          AND is_unique = 1
          AND has_filter = 1
      ) AS INT) AS refundPendingIndex,
      CAST((
        SELECT COUNT(*)
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.booking_orders')
          AND name = 'UX_booking_orders_user_idempotency'
          AND is_unique = 1
          AND has_filter = 1
      ) AS INT) AS bookingIdempotencyIndex,
      CASE
        WHEN COL_LENGTH('dbo.booking_orders', 'idempotency_key') IS NULL
          THEN 0
        ELSE 1
      END AS idempotencyColumn
  `);

  assert.deepEqual(result.recordset[0], {
    refundPendingIndex: 1,
    bookingIdempotencyIndex: 1,
    idempotencyColumn: 1,
  });
});

test('maintenance procedure skip nhanh khi lifecycle app-lock đang bận', async () => {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const lockRequest = new sql.Request(transaction);
    const lockResult = await lockRequest.query<{
      lockResult: number;
    }>(`
      DECLARE @LockResult INT;

      EXEC @LockResult = sys.sp_getapplock
        @Resource = N'CineHunt.LifecycleMaintenance',
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 0;

      SELECT @LockResult AS lockResult;
    `);

    assert.ok(
      Number(lockResult.recordset[0]?.lockResult ?? -999) >= 0,
      'Không lấy được lifecycle maintenance app-lock cho bài test',
    );

    const startedAt = Date.now();
    const result = await pool.request().query<{
      skipped: boolean | number;
      reason: string | null;
      releasedSeats: number;
      expiredHolds: number;
    }>('EXEC dbo.sp_release_expired_holds;');
    const elapsedMs = Date.now() - startedAt;

    assert.ok(
      elapsedMs < 3000,
      `Stored procedure phải skip dưới 3 giây khi app-lock bận, thực tế ${elapsedMs}ms`,
    );
    assert.equal(Boolean(result.recordset[0]?.skipped), true);
    assert.equal(result.recordset[0]?.reason, 'maintenance-busy');
  } finally {
    await transaction.rollback();
  }
});
