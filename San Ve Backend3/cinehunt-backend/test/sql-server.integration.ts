import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import 'dotenv/config';
import * as sql from 'mssql';

let pool: sql.ConnectionPool;

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
