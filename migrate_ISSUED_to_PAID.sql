-- ============================================================
-- CineHunt — Migration kèm theo fix BUG-01
-- Chuyển các booking đã thanh toán thành công nhưng bị ghi nhầm
-- status = 'ISSUED' về 'PAID'.
--
-- Chạy MỘT LẦN sau khi deploy bản fix payment.service.ts.
-- Nếu bạn đã áp dụng bản fix frontend (PAID_STATUSES chấp nhận
-- cả ISSUED) thì script này là tuỳ chọn — nhưng nên chạy để
-- dữ liệu thống nhất một chuẩn duy nhất.
-- ============================================================

-- B1: Xem trước sẽ ảnh hưởng bao nhiêu dòng
SELECT COUNT(*) AS so_booking_bi_anh_huong
FROM dbo.booking_orders
WHERE status = 'ISSUED';

-- B2: Kiểm tra chi tiết (nên xem qua trước khi UPDATE)
SELECT booking_id, booking_code, user_id, status, paid_at, issued_at, total_amount
FROM dbo.booking_orders
WHERE status = 'ISSUED'
ORDER BY booking_id DESC;

-- B3: Cập nhật — chỉ những booking có payment SUCCESS tương ứng
BEGIN TRANSACTION;

UPDATE b
SET b.status  = 'PAID',
    b.paid_at = COALESCE(b.paid_at, p.paid_at, b.issued_at, SYSDATETIME())
FROM dbo.booking_orders AS b
INNER JOIN dbo.payments AS p
        ON p.booking_id = b.booking_id
       AND p.payment_status = 'SUCCESS'
WHERE b.status = 'ISSUED';

-- Kiểm tra lại trước khi commit
SELECT COUNT(*) AS con_lai_ISSUED
FROM dbo.booking_orders
WHERE status = 'ISSUED';

COMMIT TRANSACTION;
-- Nếu số liệu không như mong đợi: ROLLBACK TRANSACTION;
