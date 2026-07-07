-- ============================================================
-- CINEHUNT - Migration Script
-- Mục đích: Đổi tên các cột reserved keyword trong SQL Server
-- Chạy file này trong SSMS trước khi restart backend
-- ============================================================

USE cinehunt; -- Đổi thành tên database của bạn nếu khác
GO

-- ============================================================
-- 1. Bảng showtimes
--    Cột [status]  -> showtime_status
--    Cột [format]  -> showtime_format
-- ============================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'showtimes' AND COLUMN_NAME = 'status'
)
BEGIN
  EXEC sp_rename 'showtimes.status', 'showtime_status', 'COLUMN';
  PRINT 'Renamed showtimes.status -> showtime_status';
END
ELSE
  PRINT 'showtimes.showtime_status already exists, skipping.';
GO

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'showtimes' AND COLUMN_NAME = 'format'
)
BEGIN
  EXEC sp_rename 'showtimes.format', 'showtime_format', 'COLUMN';
  PRINT 'Renamed showtimes.format -> showtime_format';
END
ELSE
  PRINT 'showtimes.showtime_format already exists, skipping.';
GO

-- ============================================================
-- 2. Bảng booking_orders
--    Cột status -> booking_status
-- ============================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'booking_orders' AND COLUMN_NAME = 'status'
)
BEGIN
  EXEC sp_rename 'booking_orders.status', 'booking_status', 'COLUMN';
  PRINT 'Renamed booking_orders.status -> booking_status';
END
ELSE
  PRINT 'booking_orders.booking_status already exists, skipping.';
GO

-- ============================================================
-- 3. Bảng promotions (Voucher)
--    Cột status -> voucher_status
-- ============================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'promotions' AND COLUMN_NAME = 'status'
)
BEGIN
  EXEC sp_rename 'promotions.status', 'voucher_status', 'COLUMN';
  PRINT 'Renamed promotions.status -> voucher_status';
END
ELSE
  PRINT 'promotions.voucher_status already exists, skipping.';
GO

-- ============================================================
-- 4. Bảng refunds - kiểm tra các cột thiếu tên rõ ràng
--    Nếu bảng refunds dùng camelCase tự động TypeORM:
--    refundId     -> refund_id       (PK - không đổi được bằng sp_rename)
--    refundAmount -> refund_amount
--    providerRef  -> provider_ref
--    refundStatus -> refund_status
--    requestedAt  -> requested_at
--    completedAt  -> completed_at
-- ============================================================
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'refunds' AND COLUMN_NAME = 'refundAmount'
)
BEGIN
  EXEC sp_rename 'refunds.refundAmount',  'refund_amount',  'COLUMN';
  EXEC sp_rename 'refunds.providerRef',   'provider_ref',   'COLUMN';
  EXEC sp_rename 'refunds.refundStatus',  'refund_status',  'COLUMN';
  EXEC sp_rename 'refunds.requestedAt',   'requested_at',   'COLUMN';
  EXEC sp_rename 'refunds.completedAt',   'completed_at',   'COLUMN';
  EXEC sp_rename 'refunds.paymentId',     'payment_id',     'COLUMN';
  EXEC sp_rename 'refunds.bookingId',     'booking_id',     'COLUMN';
  PRINT 'Renamed refunds camelCase columns -> snake_case';
END
ELSE
  PRINT 'refunds columns already snake_case, skipping.';
GO

-- ============================================================
-- Kiểm tra lại sau migration
-- ============================================================
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('showtimes', 'booking_orders', 'promotions', 'refunds')
  AND COLUMN_NAME IN (
    'showtime_status', 'showtime_format',
    'booking_status',
    'voucher_status',
    'refund_status', 'refund_amount'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
GO

PRINT '====== Migration complete ======';
GO
