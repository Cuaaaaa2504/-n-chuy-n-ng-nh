/* ============================================================================
   CINEHUNT DATABASE - PATCH V6.4
   Nội dung patch:
     PHẦN A - Sửa 5 lỗi ở luồng Thanh toán (theo bug_phần_Thanh_toán_SQL.md)
     PHẦN B - Bổ sung dữ liệu phim mới (theo file lịch chiếu PDF đính kèm)

   Cách dùng: chạy script này SAU KHI đã chạy file
   CineHunt_Database_V6_3_With_Sample_Data.sql (không cần reset lại DB).
   Script viết theo kiểu "chạy lại vẫn an toàn" (idempotent) ở mức tối đa có thể.
   ============================================================================ */

USE CineHuntDB;
GO

/* ============================================================================
   PHẦN A. SỬA BUG LUỒNG THANH TOÁN
   ============================================================================ */

/* ----------------------------------------------------------------------------
   A.1 (Bug #1) CK_seat_holds_status — bổ sung giá trị 'CONVERTED'
   Hậu quả cũ: transaction createBooking() bị rollback vì SP không insert/update
   được seat_holds với status = CONVERTED.
   ---------------------------------------------------------------------------- */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_seat_holds_status')
BEGIN
    ALTER TABLE dbo.seat_holds DROP CONSTRAINT CK_seat_holds_status;
END;
GO

ALTER TABLE dbo.seat_holds
    ADD CONSTRAINT CK_seat_holds_status
    CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CONVERTED', 'EXPIRED', 'CANCELLED'));
GO
-- Ghi chú: vẫn giữ tạm 'CONFIRMED' để không phá dữ liệu cũ / code cũ còn sót,
-- nhưng luồng mới (xem mục A.3) sẽ không còn sinh ra giá trị này nữa.

/* ----------------------------------------------------------------------------
   A.2 (Bug #2) CK_showtime_seats_status — bổ sung giá trị 'BOOKED'
   Hậu quả cũ: nếu chỉ fix bug #1 mà chưa fix cái này thì hệ thống crash ngay
   sau khi NestJS gán showtime_seats.status = 'BOOKED'.
   ---------------------------------------------------------------------------- */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_showtime_seats_status')
BEGIN
    ALTER TABLE dbo.showtime_seats DROP CONSTRAINT CK_showtime_seats_status;
END;
GO

ALTER TABLE dbo.showtime_seats
    ADD CONSTRAINT CK_showtime_seats_status
    CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BOOKED', 'BLOCKED'));
GO
-- Ghi chú: giữ tạm 'SOLD' cho tương thích ngược, nhưng từ nay SP sẽ dùng
-- 'BOOKED' để khớp với NestJS (xem mục A.4).

/* ----------------------------------------------------------------------------
   A.3 (Bug #3) sp_hold_seats / sp_confirm_payment — CONFIRMED -> CONVERTED
   Chuẩn hoá: khi hold được chuyển thành booking thành công, seat_holds.status
   PHẢI là 'CONVERTED' để khớp với NestJS.
   A.5 (Bug #5) — showtime_seats.status dùng 'BOOKED' thay vì 'SOLD' để khớp NestJS.
   Hai lỗi này cùng nằm trong sp_confirm_payment nên sửa gộp trong 1 lần
   CREATE OR ALTER dưới đây.
   ---------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_confirm_payment
    @booking_id BIGINT,
    @payment_method VARCHAR(30),
    @provider VARCHAR(30) = 'MOCK',
    @request_id VARCHAR(100),
    @transaction_code VARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.payments
        WHERE request_id = @request_id
          AND booking_id <> @booking_id
    )
    BEGIN
        THROW 51021, N'Request thanh toán đã được dùng cho đơn hàng khác.', 1;
    END;

    IF EXISTS (
        SELECT 1 FROM dbo.payments
        WHERE request_id = @request_id
          AND booking_id = @booking_id
          AND payment_status = 'SUCCESS'
    )
    BEGIN
        SELECT t.ticket_id, t.ticket_code, t.qr_code, t.ticket_status, t.issued_at, bd.showtime_seat_id
        FROM dbo.tickets t
        INNER JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
        WHERE bd.booking_id = @booking_id;
        RETURN;
    END;

    BEGIN TRANSACTION;

    DECLARE @Amount DECIMAL(12,2);
    DECLARE @BookingStatus VARCHAR(30);
    DECLARE @ExpiresAt DATETIME2(0);

    SELECT
        @Amount = total_amount,
        @BookingStatus = status,
        @ExpiresAt = expires_at
    FROM dbo.booking_orders WITH (UPDLOCK, HOLDLOCK)
    WHERE booking_id = @booking_id;

    IF @Amount IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51009, N'Không tìm thấy đơn đặt vé.', 1;
    END;

    IF @BookingStatus IN ('PAID', 'ISSUED')
    BEGIN
        COMMIT TRANSACTION;
        SELECT t.ticket_id, t.ticket_code, t.qr_code, t.ticket_status, t.issued_at, bd.showtime_seat_id
        FROM dbo.tickets t
        INNER JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
        WHERE bd.booking_id = @booking_id;
        RETURN;
    END;

    IF @BookingStatus <> 'PENDING_PAYMENT'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51010, N'Đơn đặt vé không còn ở trạng thái chờ thanh toán.', 1;
    END;

    IF @ExpiresAt IS NOT NULL AND @ExpiresAt <= SYSDATETIME()
    BEGIN
        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM dbo.showtime_seats ss
        INNER JOIN dbo.booking_details bd ON bd.showtime_seat_id = ss.showtime_seat_id
        WHERE bd.booking_id = @booking_id
          AND bd.status = 'ACTIVE'
          AND ss.status = 'HELD';

        UPDATE sh
        SET sh.status = 'EXPIRED',
            sh.released_at = SYSDATETIME()
        FROM dbo.seat_holds sh
        INNER JOIN dbo.booking_details bd ON bd.showtime_seat_id = sh.showtime_seat_id
        WHERE bd.booking_id = @booking_id
          AND sh.status = 'ACTIVE';

        UPDATE dbo.booking_details
        SET status = 'EXPIRED'
        WHERE booking_id = @booking_id AND status = 'ACTIVE';

        UPDATE dbo.booking_orders
        SET status = 'EXPIRED'
        WHERE booking_id = @booking_id;

        COMMIT TRANSACTION;
        THROW 51011, N'Đơn đặt vé đã hết hạn.', 1;
    END;

    DECLARE @ExpectedSeatCount INT;
    DECLARE @ValidHeldSeatCount INT;

    SELECT @ExpectedSeatCount = COUNT(*)
    FROM dbo.booking_details
    WHERE booking_id = @booking_id
      AND status = 'ACTIVE';

    SELECT @ValidHeldSeatCount = COUNT(*)
    FROM dbo.booking_details bd
    INNER JOIN dbo.showtime_seats ss WITH (UPDLOCK, HOLDLOCK)
        ON ss.showtime_seat_id = bd.showtime_seat_id
    WHERE bd.booking_id = @booking_id
      AND bd.status = 'ACTIVE'
      AND ss.status = 'HELD';

    IF @ExpectedSeatCount = 0 OR @ExpectedSeatCount <> @ValidHeldSeatCount
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51022, N'Một hoặc nhiều ghế không còn được giữ hợp lệ.', 1;
    END;

    INSERT INTO dbo.payments(
        booking_id, payment_method, provider, amount,
        transaction_code, request_id, payment_status, paid_at
    )
    VALUES(
        @booking_id, @payment_method, @provider, @Amount,
        @transaction_code, @request_id, 'SUCCESS', SYSDATETIME()
    );

    UPDATE dbo.booking_orders
    SET status = 'ISSUED',
        paid_at = SYSDATETIME(),
        issued_at = SYSDATETIME()
    WHERE booking_id = @booking_id;

    /* FIX Bug #5: dùng 'BOOKED' thay vì 'SOLD' để khớp với NestJS booking.service.ts */
    UPDATE ss
    SET ss.status = 'BOOKED',
        ss.held_by_user_id = NULL,
        ss.hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    INNER JOIN dbo.booking_details bd
        ON bd.showtime_seat_id = ss.showtime_seat_id
    WHERE bd.booking_id = @booking_id
      AND bd.status = 'ACTIVE'
      AND ss.status = 'HELD';

    /* FIX Bug #3: dùng 'CONVERTED' thay vì 'CONFIRMED' để khớp với NestJS */
    UPDATE sh
    SET sh.status = 'CONVERTED',
        sh.released_at = SYSDATETIME()
    FROM dbo.seat_holds sh
    INNER JOIN dbo.booking_details bd
        ON bd.showtime_seat_id = sh.showtime_seat_id
    WHERE bd.booking_id = @booking_id
      AND sh.status = 'ACTIVE';

    INSERT INTO dbo.tickets(
        booking_detail_id, ticket_code, qr_code, ticket_status
    )
    SELECT
        bd.booking_detail_id,
        CONCAT('TKT-', RIGHT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 20)),
        CONCAT('CINEHUNT:', bo.booking_code, ':', bd.booking_detail_id, ':', NEWID()),
        'VALID'
    FROM dbo.booking_details bd
    INNER JOIN dbo.booking_orders bo ON bo.booking_id = bd.booking_id
    WHERE bd.booking_id = @booking_id
      AND bd.status = 'ACTIVE'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.tickets t
          WHERE t.booking_detail_id = bd.booking_detail_id
      );

    COMMIT TRANSACTION;

    SELECT t.ticket_id, t.ticket_code, t.qr_code, t.ticket_status, t.issued_at, bd.showtime_seat_id
    FROM dbo.tickets t
    INNER JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
    WHERE bd.booking_id = @booking_id;
END;
GO

/* ----------------------------------------------------------------------------
   A.4 (Bug #4) sp_release_expired_holds — dọn dẹp cả hold đã CONVERTED nhưng
   booking liên quan đã bị EXPIRED/CANCELLED (booking hủy sau khi hold đã
   chuyển đổi thành công thì hold vẫn bị "mồ côi" mãi mãi nếu không dọn).
   ---------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_release_expired_holds
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    UPDATE ss WITH (UPDLOCK, ROWLOCK)
    SET status = 'AVAILABLE',
        held_by_user_id = NULL,
        hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    WHERE ss.status = 'HELD'
      AND ss.hold_expires_at <= SYSDATETIME();

    UPDATE dbo.seat_holds
    SET status = 'EXPIRED',
        released_at = SYSDATETIME()
    WHERE status = 'ACTIVE'
      AND expires_at <= SYSDATETIME();

    /* Booking hết hạn */
    UPDATE dbo.booking_orders
    SET status = 'EXPIRED',
        updated_at = SYSDATETIME()
    WHERE status = 'PENDING_PAYMENT'
      AND expires_at <= SYSDATETIME();

    /* Hủy trạng thái active của detail để ghế có thể đặt lại */
    UPDATE bd
    SET bd.status = 'EXPIRED'
    FROM dbo.booking_details bd
    INNER JOIN dbo.booking_orders bo ON bo.booking_id = bd.booking_id
    WHERE bo.status = 'EXPIRED'
      AND bd.status = 'ACTIVE';

    /* FIX Bug #4: dọn dẹp hold đã CONVERTED nhưng booking cha đã bị
       EXPIRED hoặc CANCELLED (ví dụ: hủy đơn sau khi đã convert nhưng
       chưa thanh toán, hoặc job hủy đơn quá hạn thanh toán). Nếu không,
       các hold này sẽ tồn tại vĩnh viễn và không bao giờ được release. */
    UPDATE sh
    SET sh.status = 'CANCELLED',
        sh.released_at = SYSDATETIME()
    FROM dbo.seat_holds sh
    INNER JOIN dbo.booking_details bd ON bd.showtime_seat_id = sh.showtime_seat_id
    INNER JOIN dbo.booking_orders bo ON bo.booking_id = bd.booking_id
    WHERE sh.status = 'CONVERTED'
      AND bo.status IN ('EXPIRED', 'CANCELLED');

    COMMIT TRANSACTION;
END;
GO

PRINT N'PHẦN A — Đã sửa xong 5 lỗi luồng Thanh toán.';
GO

/* ============================================================================
   PHẦN B. BỔ SUNG DỮ LIỆU PHIM MỚI (theo lịch chiếu PDF)
   ============================================================================ */

/* B.1 Bổ sung thể loại còn thiếu (không trùng thể loại đã seed sẵn) */
INSERT INTO dbo.genres(genre_name, slug)
SELECT v.genre_name, v.slug
FROM (VALUES
    (N'Hồi hộp',  'hoi-hop'),
    (N'Tâm lý',   'tam-ly'),
    (N'Hài',      'hai'),
    (N'Gia đình', 'gia-dinh'),
    (N'Phiêu lưu','phieu-luu'),
    (N'Thần thoại','than-thoai'),
    (N'Bí ẩn',    'bi-an')
) AS v(genre_name, slug)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.genres g WHERE g.slug = v.slug
);
GO

/* B.2 Bổ sung phim mới (bỏ qua nếu title đã tồn tại, để chạy lại an toàn) */
INSERT INTO dbo.movies(
    title, original_title, description, duration_minutes,
    release_date, age_rating, director, actors,
    country, language, poster_url,
    average_rating, status
)
SELECT v.title, v.original_title, v.description, v.duration_minutes,
       v.release_date, v.age_rating, v.director, v.actors,
       v.country, v.language, v.poster_url,
       0, v.status
FROM (VALUES
(N'Backrooms: Thực Thể Quỷ Quyệt', N'Backrooms',
 N'Dựa trên hiện tượng creepypasta ám ảnh nhất thập kỷ, bộ phim theo chân người phụ nữ rơi vào mê cung vô tận và chạy đua để thoát ra.',
 110, '20260626', 'T16', N'Kane Parsons', N'Chiwetel Ejiofor, Renate Reinsve, Mark Duplass',
 N'Mỹ', N'Tiếng Anh - Phụ đề Tiếng Việt', N'https://example.com/posters/backrooms.jpg', 'COMING_SOON'),

(N'Huyết Ngải Ái Tình', NULL,
 N'Bùa yêu dẫn lối, quỷ dữ đưa tang — câu chuyện kinh dị tâm lý về một lời nguyền tình yêu đẫm máu.',
 98, '20260717', 'T18', N'Razka Robby Ertanto', N'Anjasmara, Lulu Tobing, Carissa Perusset',
 N'Indonesia', N'Tiếng Indonesia - Phụ đề Tiếng Việt', N'https://example.com/posters/huyet-ngai-ai-tinh.jpg', 'COMING_SOON'),

(N'Quỷ Bắt Hồn', NULL,
 N'Đúng tháng cô hồn, một gia đình đối mặt với thế lực siêu nhiên đe dọa đến từng thành viên.',
 103, '20260710', 'T16', N'Hải Bùi',
 N'Quang Tuấn, Anh Phạm, Đinh Y Nhung, bé Huy Anh, bé Gia Phong, La Thành, Uy Trần, Sỹ Toàn, Quốc Tân, bé Minh Anh, Ngân Quỳnh, Thanh Châu, Phương Linh',
 N'Việt Nam', N'Tiếng Việt', N'https://example.com/posters/quy-bat-hon.jpg', 'COMING_SOON'),

(N'Minions & Quái Vật', NULL,
 N'Các chú Minion tinh nghịch bước vào một cuộc phiêu lưu mới đầy quái vật và tiếng cười.',
 90, '20260701', 'P', N'Pierre Coffin', NULL,
 N'Mỹ', N'Phụ đề Tiếng Việt & Lồng Tiếng Việt', N'https://example.com/posters/minions-quai-vat.jpg', 'COMING_SOON'),

(N'Phim Điện Ảnh Doraemon: Nobita và Lâu Đài Dưới Đáy Biển (Phiên bản mới)', NULL,
 N'Nobita và những người bạn khám phá tòa lâu đài huyền bí dưới đáy đại dương.',
 101, '20260522', 'P', N'Tetsuo Yajima',
 N'Wasabi Mizuta, Megumi Oohara, Yumi Kakazu, Subaru Kimura, Tomokazu Seki',
 N'Nhật Bản', N'Tiếng Nhật - Phụ đề Tiếng Việt/Lồng tiếng Việt', N'https://example.com/posters/doraemon-lau-dai-day-bien.jpg', 'COMING_SOON'),

(N'The Odyssey', NULL,
 N'Bộ phim sử thi của Christopher Nolan, được quay hoàn toàn bằng máy quay IMAX, tái hiện hành trình huyền thoại Odyssey.',
 173, '20260717', 'T16', N'Christopher Nolan',
 N'Benny Safdie, Anne Hathaway, Matt Damon, Robert Pattinson, Tom Holland, Zendaya, Charlize Theron',
 N'Mỹ', N'English - Vietnamese subtitle', N'https://example.com/posters/the-odyssey.jpg', 'COMING_SOON'),

(N'Phim Điện Ảnh Thám Tử Lừng Danh Conan: Thiên Thần Sa Ngã Trên Xa Lộ', NULL,
 N'Conan cùng đồng đội phá án trong một vụ việc bí ẩn bùng nổ tốc độ trên xa lộ.',
 109, '20260724', 'T13', N'Hasui Takahiro',
 N'Minami Takayama, Wakana Yamazaki, Rikiya Koyama, Miyuki Sawashiro, Shin-ichiro Miki',
 N'Nhật Bản', N'Tiếng Nhật - Phụ đề Tiếng Việt; Lồng tiếng', N'https://example.com/posters/conan-thien-than-sa-nga.jpg', 'COMING_SOON'),

(N'Hành Trình Của Moana', NULL,
 N'Moana cùng Maui tiếp tục hành trình phiêu lưu mới trên đại dương bao la.',
 116, '20260710', 'K', N'Thomas Kail', N'Catherine Laga''aia, Dwayne Johnson, John Tui',
 N'Mỹ', N'Tiếng Anh - Phụ đề Tiếng Việt; Lồng tiếng Việt', N'https://example.com/posters/hanh-trinh-cua-moana.jpg', 'COMING_SOON'),

(N'Cảm Ơn Người Đã Thức Cùng Tôi', NULL,
 N'Câu chuyện dành tặng tinh thần, tình yêu và tình bạn của một nhóm người trẻ cùng nhau vượt qua giông bão cuộc đời.',
 137, '20260227', 'K', N'Chung Chí Công', N'Võ Phan Kim Khánh, Trần Doãn Hoàng, Nguyễn Hùng',
 N'Việt Nam', N'Tiếng Việt', N'https://example.com/posters/cam-on-nguoi-da-thuc-cung-toi.jpg', 'NOW_SHOWING'),

(N'Đêm Truy Sát', NULL,
 N'Từ đạo diễn phim Rambo: Last Blood, một cuộc truy sát nghẹt thở xuyên đêm.',
 91, '20260717', 'T18', N'Adrian Grunberg', N'Milla Jovovich, Isabel Myers, Shane Williams',
 N'Mỹ', N'Tiếng Anh - Phụ đề Tiếng Việt', N'https://example.com/posters/dem-truy-sat.jpg', 'COMING_SOON'),

(N'Ám Ảnh', NULL,
 N'Cẩn thận với kẻ bạn đang cùng sống — một câu chuyện giật gân đầy ám ảnh.',
 109, '20260619', 'T18', N'Curry Barker',
 N'Michael Johnston, Inde Navarrette, Cooper Tomlinson, Megan Lawless, Andy Richter',
 N'Mỹ', N'Kinh dị, Giật gân - Phụ đề Tiếng Việt', N'https://example.com/posters/am-anh.jpg', 'COMING_SOON'),

(N'Mẹ Ơi, Về Nhà', NULL,
 N'Bộ phim Việt - Hàn về thế hệ "cửa hàng tiệp lợi", nếu cả đời không hoang mang thì sao?',
 98, '20260710', 'T16', N'Yun Byung Ki', N'Lee Yi Kyung, Hoàng Yến Chibi, Choi Daniel, Minh Hà',
 N'Hàn Quốc', N'Tiếng Hàn - Phụ đề Tiếng Việt', N'https://example.com/posters/me-oi-ve-nha.jpg', 'COMING_SOON'),

(N'Ma Nữ Oán Tình', NULL,
 N'Màn trả thù tình nồng bỏng và điên loạn từ màn ảnh Thái Lan.',
 96, '20260710', 'T18', N'KrisPond Witthayakhajorndet, KruNing Bhanbhassa Dhubthien, Ping Lumpraploeng',
 N'Engfa Waraha, Apo Nattawin, Freen Sarocha, Jes Jespipat',
 N'Thái Lan', N'Tiếng Thái - Phụ đề Tiếng Việt, Tiếng Anh', N'https://example.com/posters/ma-nu-oan-tinh.jpg', 'COMING_SOON'),

(N'Câu Chuyện Đồ Chơi 5', N'Toy Story 5',
 N'Woody, Buzz và những người bạn đồ chơi trở lại với hành trình phiêu lưu mới đầy cảm xúc.',
 102, '20260619', 'P', N'Kenna Harris, Andrew Stanton', N'Keanu Reeves, Tom Hanks, Annie Potts',
 N'Mỹ', N'Tiếng Anh - Phụ đề Tiếng Việt và Lồng tiếng Việt', N'https://example.com/posters/toy-story-5.jpg', 'COMING_SOON'),

(N'Colony: Bầy Xác Sống', NULL,
 N'Từ đạo diễn "Train to Busan" và "Hellbound" — Yeon Sang-ho, một đại dịch xác sống nhấn chìm cả một vùng đất.',
 122, '20260612', 'T16', N'YEON Sang-ho', N'Gianna JUN, KOO Kyo-hwan, JI Chang-wook, Shin Hyun-been, KIM Shin-rock, GO Soo',
 N'Hàn Quốc', N'Tiếng Hàn - Phụ đề Tiếng Việt và Tiếng Anh', N'https://example.com/posters/colony-bay-xac-song.jpg', 'COMING_SOON'),

(N'Supergirl', NULL,
 N'Nữ siêu anh hùng nhà DC bước ra ánh sáng trong hành trình chinh phục sức mạnh và bản thân.',
 108, '20250626', 'T13', N'Craig Gillespie',
 N'Milly Alcock, Matthias Schoenaerts, Eve Ridley, David Krumholtz, Emily Beecham, Jason Momoa',
 N'Mỹ', N'Tiếng Anh - Phụ đề Tiếng Việt', N'https://example.com/posters/supergirl.jpg', 'COMING_SOON'),

(N'Leviticus: Bóng Quỷ', NULL,
 N'Dục vọng phải sám hối, quỷ dữ đến hỏi tội — kiệt tác kinh dị được mong chờ nhất.',
 85, '20260703', 'T18', N'Adrian Chiarella', N'Joe Bird, Stacy Clausen, Jeremy Blewitt',
 N'Mỹ', N'Tiếng Anh và phụ đề Tiếng Việt', N'https://example.com/posters/leviticus-bong-quy.jpg', 'COMING_SOON'),

(N'Đồng Dao Ma Quái', NULL,
 N'Một khi xúc xắc lăn, mạng sống cũng được đặt cược trong trò chơi đồng dao rùng rợn.',
 123, '20260703', 'T18', N'Preaw Chanatip Wongpontree',
 N'Panisara Rikulsurakan, Ongart Jeamcharoenpornkul, Win Sakulsangprapha',
 N'Thái Lan', N'Tiếng Thái - Phụ đề Tiếng Việt', N'https://example.com/posters/dong-dao-ma-quai.jpg', 'COMING_SOON'),

(N'Lầu Chú Hỏa', NULL,
 N'Lời nguyền con ma nhà họ hứa — khai đàn, gọi hồn, đánh thức ác linh.',
 94, '20260612', 'T18', N'Hùng Trần',
 N'Trần Kỳ Anh, Nguyễn Minh Thời, Ngọc Chi Bảo, Phụng Hoàng, Nguyễn Công Nương, Dũng Hà',
 N'Việt Nam', N'Tiếng Việt', N'https://example.com/posters/lau-chu-hoa.jpg', 'COMING_SOON')
) AS v(title, original_title, description, duration_minutes, release_date, age_rating,
       director, actors, country, language, poster_url, status)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.movies m WHERE m.title = v.title
);
GO

/* B.3 Gắn thể loại phim (movie_genres) — map theo nội dung trong PDF */
;WITH G AS (
    SELECT genre_id, slug FROM dbo.genres
),
M AS (
    SELECT movie_id, title FROM dbo.movies
),
MovieGenreMap AS (
    SELECT title, slug FROM (VALUES
        (N'Backrooms: Thực Thể Quỷ Quyệt', 'hoi-hop'),
        (N'Backrooms: Thực Thể Quỷ Quyệt', 'khoa-hoc-vien-tuong'),
        (N'Backrooms: Thực Thể Quỷ Quyệt', 'kinh-di'),

        (N'Huyết Ngải Ái Tình', 'hoi-hop'),
        (N'Huyết Ngải Ái Tình', 'kinh-di'),
        (N'Huyết Ngải Ái Tình', 'tam-ly'),

        (N'Quỷ Bắt Hồn', 'hanh-dong'),
        (N'Quỷ Bắt Hồn', 'kinh-di'),

        (N'Minions & Quái Vật', 'hoat-hinh'),

        (N'Phim Điện Ảnh Doraemon: Nobita và Lâu Đài Dưới Đáy Biển (Phiên bản mới)', 'hoat-hinh'),
        (N'Phim Điện Ảnh Doraemon: Nobita và Lâu Đài Dưới Đáy Biển (Phiên bản mới)', 'phieu-luu'),

        (N'The Odyssey', 'hanh-dong'),
        (N'The Odyssey', 'than-thoai'),

        (N'Phim Điện Ảnh Thám Tử Lừng Danh Conan: Thiên Thần Sa Ngã Trên Xa Lộ', 'bi-an'),
        (N'Phim Điện Ảnh Thám Tử Lừng Danh Conan: Thiên Thần Sa Ngã Trên Xa Lộ', 'hanh-dong'),
        (N'Phim Điện Ảnh Thám Tử Lừng Danh Conan: Thiên Thần Sa Ngã Trên Xa Lộ', 'hoat-hinh'),

        (N'Hành Trình Của Moana', 'gia-dinh'),
        (N'Hành Trình Của Moana', 'hai'),
        (N'Hành Trình Của Moana', 'hanh-dong'),
        (N'Hành Trình Của Moana', 'phieu-luu'),

        (N'Cảm Ơn Người Đã Thức Cùng Tôi', 'gia-dinh'),
        (N'Cảm Ơn Người Đã Thức Cùng Tôi', 'tinh-cam'),

        (N'Đêm Truy Sát', 'hanh-dong'),
        (N'Đêm Truy Sát', 'hoi-hop'),

        (N'Ám Ảnh', 'hoi-hop'),
        (N'Ám Ảnh', 'kinh-di'),

        (N'Mẹ Ơi, Về Nhà', 'tam-ly'),
        (N'Mẹ Ơi, Về Nhà', 'tinh-cam'),

        (N'Ma Nữ Oán Tình', 'hai'),
        (N'Ma Nữ Oán Tình', 'kinh-di'),
        (N'Ma Nữ Oán Tình', 'tam-ly'),

        (N'Câu Chuyện Đồ Chơi 5', 'hoat-hinh'),
        (N'Câu Chuyện Đồ Chơi 5', 'phieu-luu'),

        (N'Colony: Bầy Xác Sống', 'hanh-dong'),
        (N'Colony: Bầy Xác Sống', 'hoi-hop'),
        (N'Colony: Bầy Xác Sống', 'khoa-hoc-vien-tuong'),

        (N'Supergirl', 'hanh-dong'),
        (N'Supergirl', 'phieu-luu'),

        (N'Leviticus: Bóng Quỷ', 'kinh-di'),

        (N'Đồng Dao Ma Quái', 'hoi-hop'),
        (N'Đồng Dao Ma Quái', 'kinh-di'),
        (N'Đồng Dao Ma Quái', 'than-thoai'),

        (N'Lầu Chú Hỏa', 'bi-an'),
        (N'Lầu Chú Hỏa', 'kinh-di')
    ) AS x(title, slug)
)
INSERT INTO dbo.movie_genres(movie_id, genre_id)
SELECT DISTINCT M.movie_id, G.genre_id
FROM MovieGenreMap MGM
INNER JOIN M ON M.title = MGM.title
INNER JOIN G ON G.slug = MGM.slug
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.movie_genres mg
    WHERE mg.movie_id = M.movie_id AND mg.genre_id = G.genre_id
);
GO

PRINT N'PHẦN B — Đã bổ sung thể loại và phim mới từ lịch chiếu PDF.';
GO

/* Kiểm tra nhanh sau khi patch */
SELECT 'genres' AS table_name, COUNT(*) AS row_count FROM dbo.genres
UNION ALL SELECT 'movies', COUNT(*) FROM dbo.movies
UNION ALL SELECT 'movie_genres', COUNT(*) FROM dbo.movie_genres;
GO

PRINT N'CineHunt Patch V6.4 (bugfix Thanh toán + bổ sung phim) đã chạy xong.';
GO
