/* =========================================================
   DATABASE: MovieTicketHuntingDB
   MÔ TẢ: Hệ thống săn vé / đặt vé xem phim
   DBMS: Microsoft SQL Server
   BẢN SỬA: Bổ sung session/JWT, OTP, combo, voucher,
            audit log, thông tin săn vé theo form frontend,
            thanh toán mở rộng, quy trình ISSUED,
            giữ nhiều ghế theo transaction, audit trạng thái ghế,
            chặn trùng lịch chiếu và tự xử lý hold hết hạn.
   ========================================================= */

IF DB_ID('MovieTicketHuntingDB') IS NOT NULL
BEGIN
    ALTER DATABASE MovieTicketHuntingDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MovieTicketHuntingDB;
END
GO

CREATE DATABASE MovieTicketHuntingDB;
GO

USE MovieTicketHuntingDB;
GO

/* =========================================================
   1. USERS - NGƯỜI DÙNG
   ========================================================= */

CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    email_verified BIT NOT NULL DEFAULT 0,
    last_login_at DATETIME NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT chk_users_role
        CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),

    CONSTRAINT chk_users_status
        CHECK (status IN ('ACTIVE', 'LOCKED', 'DELETED'))
);
GO

/* =========================================================
   2. GENRES - THỂ LOẠI PHIM
   ========================================================= */


/* =========================================================
   1.1 REFRESH_TOKENS - PHIÊN ĐĂNG NHẬP / JWT REFRESH TOKEN
   Dùng cho đăng xuất, gia hạn phiên và thu hồi token.
   ========================================================= */

CREATE TABLE refresh_tokens (
    refresh_token_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expired_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT uq_refresh_token_hash
        UNIQUE (token_hash)
);
GO

/* =========================================================
   1.2 OTP_CODES - XÁC THỰC EMAIL / QUÊN MẬT KHẨU
   ========================================================= */

CREATE TABLE otp_codes (
    otp_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    expired_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_otp_codes_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT chk_otp_purpose
        CHECK (purpose IN ('REGISTER_VERIFY', 'FORGOT_PASSWORD', 'CHANGE_PASSWORD'))
);
GO

CREATE TABLE genres (
    genre_id INT IDENTITY(1,1) PRIMARY KEY,
    genre_name NVARCHAR(100) NOT NULL UNIQUE
);
GO

/* =========================================================
   3. MOVIES - PHIM
   ========================================================= */

CREATE TABLE movies (
    movie_id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    duration_minutes INT NOT NULL,
    age_rating VARCHAR(10),
    release_date DATE,
    poster_url VARCHAR(255),
    trailer_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'NOW_SHOWING',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT chk_movies_duration
        CHECK (duration_minutes > 0),

    CONSTRAINT chk_movies_status
        CHECK (status IN ('COMING_SOON', 'NOW_SHOWING', 'ENDED'))
);
GO

/* =========================================================
   4. MOVIE_GENRES - LIÊN KẾT PHIM VÀ THỂ LOẠI
   ========================================================= */

CREATE TABLE movie_genres (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,

    PRIMARY KEY (movie_id, genre_id),

    CONSTRAINT fk_movie_genres_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id),

    CONSTRAINT fk_movie_genres_genre
        FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
);
GO

/* =========================================================
   5. CINEMAS - RẠP CHIẾU
   ========================================================= */

CREATE TABLE cinemas (
    cinema_id INT IDENTITY(1,1) PRIMARY KEY,
    cinema_name NVARCHAR(150) NOT NULL,
    address NVARCHAR(255) NOT NULL,
    city NVARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT chk_cinemas_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

/* =========================================================
   6. ROOMS - PHÒNG CHIẾU
   ========================================================= */

CREATE TABLE rooms (
    room_id INT IDENTITY(1,1) PRIMARY KEY,
    cinema_id INT NOT NULL,
    room_name NVARCHAR(100) NOT NULL,
    total_seats INT NOT NULL,
    room_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT fk_rooms_cinema
        FOREIGN KEY (cinema_id) REFERENCES cinemas(cinema_id),

    CONSTRAINT chk_rooms_total_seats
        CHECK (total_seats > 0),

    CONSTRAINT chk_rooms_type
        CHECK (room_type IN ('STANDARD', 'VIP', 'IMAX')),

    CONSTRAINT chk_rooms_status
        CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),

    CONSTRAINT uq_room_in_cinema
        UNIQUE (cinema_id, room_name)
);
GO

/* =========================================================
   7. SEATS - GHẾ TRONG PHÒNG CHIẾU
   ========================================================= */

CREATE TABLE seats (
    seat_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    seat_row VARCHAR(5) NOT NULL,
    seat_number INT NOT NULL,
    seat_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT fk_seats_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id),

    CONSTRAINT uq_seat_in_room
        UNIQUE (room_id, seat_row, seat_number),

    CONSTRAINT chk_seat_number
        CHECK (seat_number > 0),

    CONSTRAINT chk_seat_type
        CHECK (seat_type IN ('NORMAL', 'VIP', 'COUPLE')),

    CONSTRAINT chk_seat_status
        CHECK (status IN ('ACTIVE', 'BROKEN', 'INACTIVE'))
);
GO

/* =========================================================
   8. SHOWTIMES - SUẤT CHIẾU
   ========================================================= */

CREATE TABLE showtimes (
    showtime_id INT IDENTITY(1,1) PRIMARY KEY,
    movie_id INT NOT NULL,
    room_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_showtimes_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id),

    CONSTRAINT fk_showtimes_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id),

    CONSTRAINT chk_showtime_price
        CHECK (base_price >= 0),

    CONSTRAINT chk_showtime_time
        CHECK (end_time > start_time),

    CONSTRAINT chk_showtime_status
        CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);
GO

/* =========================================================
   8.1 TRIGGER: TỰ CẬP NHẬT updated_at KHI ADMIN SỬA SUẤT CHIẾU
   ========================================================= */

CREATE TRIGGER trg_showtimes_updated_at
ON showtimes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE st
    SET updated_at = GETDATE()
    FROM showtimes st
    INNER JOIN inserted i
        ON st.showtime_id = i.showtime_id;
END;
GO

/* =========================================================
   8.2 TRIGGER: CHẶN TRÙNG LỊCH CHIẾU TRONG CÙNG PHÒNG
   ========================================================= */

CREATE TRIGGER trg_showtimes_no_overlap
ON showtimes
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ kiểm tra khi các trường ảnh hưởng lịch chiếu thay đổi.
    -- Trigger updated_at chỉ sửa updated_at nên sẽ không bị vòng lặp kiểm tra thừa.
    IF NOT (
        UPDATE(room_id)
        OR UPDATE(start_time)
        OR UPDATE(end_time)
        OR UPDATE(status)
    )
        RETURN;

    -- Một phòng không được có 2 suất chiếu đang hiệu lực bị giao nhau thời gian.
    -- Điều kiện overlap chuẩn: A.start < B.end AND A.end > B.start.
    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN showtimes st WITH (UPDLOCK, HOLDLOCK)
            ON st.room_id = i.room_id
           AND st.showtime_id <> i.showtime_id
           AND st.status <> 'CANCELLED'
           AND i.status <> 'CANCELLED'
           AND i.start_time < st.end_time
           AND i.end_time > st.start_time
    )
    BEGIN
        RAISERROR(N'Lịch chiếu bị trùng: cùng một phòng không thể có hai suất chiếu giao nhau thời gian.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;
END;
GO

/* =========================================================
   9. SHOWTIME_SEATS - GHẾ THEO TỪNG SUẤT CHIẾU
   Đây là bảng cực quan trọng.
   Cùng ghế A1 nhưng mỗi suất chiếu có trạng thái riêng.
   ========================================================= */

CREATE TABLE showtime_seats (
    showtime_seat_id INT IDENTITY(1,1) PRIMARY KEY,
    showtime_id INT NOT NULL,
    seat_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    price DECIMAL(10,2) NOT NULL,
    held_by_user_id INT NULL,
    hold_expires_at DATETIME NULL,

    CONSTRAINT fk_showtime_seats_showtime
        FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),

    CONSTRAINT fk_showtime_seats_seat
        FOREIGN KEY (seat_id) REFERENCES seats(seat_id),

    CONSTRAINT fk_showtime_seats_held_user
        FOREIGN KEY (held_by_user_id) REFERENCES users(user_id),

    CONSTRAINT uq_showtime_seat
        UNIQUE (showtime_id, seat_id),

    CONSTRAINT chk_showtime_seat_price
        CHECK (price >= 0),

    CONSTRAINT chk_showtime_seat_status
        CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED'))
);
GO

/* =========================================================
   10. SEAT_HOLDS - GIỮ GHẾ TẠM THỜI
   ========================================================= */

CREATE TABLE seat_holds (
    hold_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    showtime_seat_id INT NOT NULL,
    hold_token VARCHAR(100) NOT NULL UNIQUE,
    expired_at DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_seat_holds_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT fk_seat_holds_showtime_seat
        FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats(showtime_seat_id),

    CONSTRAINT chk_hold_status
        CHECK (status IN ('ACTIVE', 'EXPIRED', 'CONFIRMED', 'CANCELLED'))
);
GO


/* =========================================================
   10.1 CONCESSION_COMBOS - COMBO BẮP NƯỚC
   Phục vụ đúng form frontend: wantsCombo.
   ========================================================= */

CREATE TABLE concession_combos (
    combo_id INT IDENTITY(1,1) PRIMARY KEY,
    combo_name NVARCHAR(150) NOT NULL,
    description NVARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT chk_combo_price
        CHECK (price >= 0),

    CONSTRAINT chk_combo_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

/* =========================================================
   10.2 VOUCHERS - MÃ GIẢM GIÁ
   Không bắt buộc cho demo, nhưng cần nếu backend tính giảm giá.
   ========================================================= */

CREATE TABLE vouchers (
    voucher_id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount DECIMAL(10,2) NULL,
    min_order_amount DECIMAL(10,2) NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    usage_limit INT NULL,
    used_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT chk_voucher_discount_type
        CHECK (discount_type IN ('PERCENT', 'AMOUNT')),

    CONSTRAINT chk_voucher_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),

    CONSTRAINT chk_voucher_time
        CHECK (end_at > start_at)
);
GO

/* =========================================================
   11. BOOKING_ORDERS - ĐƠN ĐẶT VÉ
   ========================================================= */

CREATE TABLE booking_orders (
    booking_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    showtime_id INT NOT NULL,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    voucher_id INT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    expired_at DATETIME,

    CONSTRAINT fk_booking_orders_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT fk_booking_orders_showtime
        FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),

    CONSTRAINT fk_booking_orders_voucher
        FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id),

    CONSTRAINT chk_booking_amount
        CHECK (total_amount >= 0 AND discount_amount >= 0 AND final_amount >= 0),

    CONSTRAINT chk_booking_status
        CHECK (status IN (
            'PENDING_PAYMENT',
            'PAID',
            'ISSUED',
            'CANCELLED',
            'EXPIRED',
            'FAILED',
            'REFUNDED'
        ))
);
GO

/* =========================================================
   12. BOOKING_DETAILS - CHI TIẾT ĐẶT VÉ
   ========================================================= */

CREATE TABLE booking_details (
    booking_detail_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    showtime_seat_id INT NOT NULL,
    seat_price DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_booking_details_booking
        FOREIGN KEY (booking_id) REFERENCES booking_orders(booking_id),

    CONSTRAINT fk_booking_details_showtime_seat
        FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats(showtime_seat_id),

    CONSTRAINT uq_booking_seat
        UNIQUE (booking_id, showtime_seat_id),

    CONSTRAINT uq_booking_details_showtime_seat
        UNIQUE (showtime_seat_id),

    CONSTRAINT chk_booking_detail_price
        CHECK (seat_price >= 0)
);
GO

/* =========================================================
   13. PAYMENTS - THANH TOÁN
   ========================================================= */


/* =========================================================
   12.1 BOOKING_COMBOS - COMBO ĐI KÈM ĐƠN VÉ
   ========================================================= */

CREATE TABLE booking_combos (
    booking_combo_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    combo_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_booking_combos_booking
        FOREIGN KEY (booking_id) REFERENCES booking_orders(booking_id),

    CONSTRAINT fk_booking_combos_combo
        FOREIGN KEY (combo_id) REFERENCES concession_combos(combo_id),

    CONSTRAINT chk_booking_combo_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_booking_combo_price
        CHECK (unit_price >= 0)
);
GO

CREATE TABLE payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_code VARCHAR(100),
    payment_url VARCHAR(500) NULL,
    provider_response NVARCHAR(MAX) NULL,
    failed_reason NVARCHAR(255) NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id) REFERENCES booking_orders(booking_id),

    CONSTRAINT chk_payment_amount
        CHECK (amount >= 0),

    CONSTRAINT chk_payment_method
        CHECK (payment_method IN ('MOMO', 'VNPAY', 'BANKING', 'CASH')),

    CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))
);
GO

/* =========================================================
   14. TICKETS - VÉ ĐIỆN TỬ / QR
   ========================================================= */

CREATE TABLE tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    booking_detail_id INT NOT NULL,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    qr_code VARCHAR(255) NOT NULL,
    ticket_status VARCHAR(20) NOT NULL DEFAULT 'VALID',
    issued_at DATETIME NOT NULL DEFAULT GETDATE(),
    checked_in_at DATETIME,

    CONSTRAINT fk_tickets_booking_detail
        FOREIGN KEY (booking_detail_id) REFERENCES booking_details(booking_detail_id),

    CONSTRAINT chk_ticket_status
        CHECK (ticket_status IN ('VALID', 'USED', 'CANCELLED', 'EXPIRED'))
);
GO

/* =========================================================
   15. TICKET_WATCH_REQUESTS - YÊU CẦU SĂN VÉ
   ========================================================= */

CREATE TABLE ticket_watch_requests (
    watch_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    cinema_id INT NULL,
    preferred_date DATE,
    preferred_time_from TIME,
    preferred_time_to TIME,
    preferred_seat_type VARCHAR(20),
    seat_preference VARCHAR(20) NULL,
    ticket_quantity INT NOT NULL DEFAULT 1,
    max_budget DECIMAL(10,2) NULL,
    wants_combo BIT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_watch_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT fk_watch_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id),

    CONSTRAINT fk_watch_cinema
        FOREIGN KEY (cinema_id) REFERENCES cinemas(cinema_id),

    CONSTRAINT chk_watch_status
        CHECK (status IN ('ACTIVE', 'MATCHED', 'CANCELLED', 'EXPIRED')),

    CONSTRAINT chk_watch_ticket_quantity
        CHECK (ticket_quantity > 0),

    CONSTRAINT chk_watch_max_budget
        CHECK (max_budget IS NULL OR max_budget >= 0),

    CONSTRAINT chk_watch_seat_preference
        CHECK (seat_preference IS NULL OR seat_preference IN ('middle', 'back', 'front', 'any')),

    CONSTRAINT chk_watch_seat_type
        CHECK (
            preferred_seat_type IS NULL
            OR preferred_seat_type IN ('NORMAL', 'VIP', 'COUPLE')
        )
);
GO

/* =========================================================
   16. NOTIFICATIONS - THÔNG BÁO
   ========================================================= */

CREATE TABLE notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX),
    notification_type VARCHAR(30) NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT chk_notification_type
        CHECK (notification_type IN (
            'BOOKING',
            'PAYMENT',
            'TICKET_WATCH',
            'SYSTEM'
        ))
);
GO


/* =========================================================
   16.1 AUDIT_LOGS - NHẬT KÝ THAO TÁC ADMIN / STAFF
   ========================================================= */

CREATE TABLE audit_logs (
    audit_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NULL,
    target_id INT NULL,
    description NVARCHAR(MAX) NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
);
GO

/* =========================================================
   17. INDEXES - TỐI ƯU TRUY VẤN
   Vì database không tự thần giao cách cảm được.
   ========================================================= */

CREATE INDEX idx_movies_status
ON movies(status);
GO

CREATE INDEX idx_users_email_status
ON users(email, status);
GO

CREATE INDEX idx_refresh_tokens_user_expired
ON refresh_tokens(user_id, expired_at);
GO

CREATE INDEX idx_otp_codes_user_purpose
ON otp_codes(user_id, purpose, expired_at);
GO

CREATE INDEX idx_showtimes_movie
ON showtimes(movie_id);
GO

CREATE INDEX idx_showtimes_room_time
ON showtimes(room_id, start_time, end_time);
GO

CREATE INDEX idx_showtime_seats_status
ON showtime_seats(showtime_id, status);
GO

CREATE INDEX idx_showtime_seats_hold_expiry
ON showtime_seats(status, hold_expires_at, held_by_user_id);
GO

CREATE INDEX idx_seat_holds_status_expired
ON seat_holds(status, expired_at);
GO

CREATE INDEX idx_booking_orders_user
ON booking_orders(user_id);
GO

CREATE INDEX idx_booking_orders_status
ON booking_orders(status);
GO

CREATE INDEX idx_payments_booking
ON payments(booking_id);
GO

CREATE INDEX idx_booking_combos_booking
ON booking_combos(booking_id);
GO

CREATE INDEX idx_tickets_status
ON tickets(ticket_status);
GO

CREATE INDEX idx_watch_requests_status
ON ticket_watch_requests(status);
GO

CREATE INDEX idx_audit_logs_user_created
ON audit_logs(user_id, created_at);
GO

/* =========================================================
   18. TRIGGER: TỰ CẬP NHẬT updated_at CHO USERS
   ========================================================= */

CREATE TRIGGER trg_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE users
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.user_id = i.user_id;
END;
GO

/* =========================================================
   19. TRIGGER: TỰ CẬP NHẬT updated_at CHO MOVIES
   ========================================================= */

CREATE TRIGGER trg_movies_updated_at
ON movies
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE movies
    SET updated_at = GETDATE()
    FROM movies m
    INNER JOIN inserted i ON m.movie_id = i.movie_id;
END;
GO

/* =========================================================
   20. PROCEDURE: TẠO GHẾ CHO SUẤT CHIẾU
   Khi tạo suất chiếu xong, gọi proc này để sinh showtime_seats.
   ========================================================= */

CREATE PROCEDURE sp_generate_showtime_seats
    @showtime_id INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @room_id INT;
    DECLARE @base_price DECIMAL(10,2);

    SELECT 
        @room_id = room_id,
        @base_price = base_price
    FROM showtimes
    WHERE showtime_id = @showtime_id;

    IF @room_id IS NULL
    BEGIN
        RAISERROR(N'Suất chiếu không tồn tại.', 16, 1);
        RETURN;
    END;

    INSERT INTO showtime_seats (
        showtime_id,
        seat_id,
        status,
        price
    )
    SELECT
        @showtime_id,
        s.seat_id,
        'AVAILABLE',
        CASE
            WHEN s.seat_type = 'VIP' THEN @base_price * 1.3
            WHEN s.seat_type = 'COUPLE' THEN @base_price * 2
            ELSE @base_price
        END
    FROM seats s
    WHERE s.room_id = @room_id
      AND s.status = 'ACTIVE'
      AND NOT EXISTS (
          SELECT 1
          FROM showtime_seats ss
          WHERE ss.showtime_id = @showtime_id
            AND ss.seat_id = s.seat_id
      );
END;
GO

/* =========================================================
   20.1 PROCEDURE: TẠO SUẤT CHIẾU CÓ KIỂM TRA TRÙNG LỊCH
   Backend nên gọi procedure này thay vì INSERT trực tiếp.
   Trigger trg_showtimes_no_overlap vẫn là lớp bảo vệ cuối cùng.
   ========================================================= */

CREATE PROCEDURE sp_create_showtime
    @movie_id INT,
    @room_id INT,
    @start_time DATETIME,
    @end_time DATETIME,
    @base_price DECIMAL(10,2),
    @status VARCHAR(20) = 'OPEN'
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM movies WHERE movie_id = @movie_id)
        BEGIN
            RAISERROR(N'Phim không tồn tại.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF NOT EXISTS (SELECT 1 FROM rooms WHERE room_id = @room_id AND status = 'ACTIVE')
        BEGIN
            RAISERROR(N'Phòng chiếu không tồn tại hoặc không hoạt động.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF @end_time <= @start_time
        BEGIN
            RAISERROR(N'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF EXISTS (
            SELECT 1
            FROM showtimes WITH (UPDLOCK, HOLDLOCK)
            WHERE room_id = @room_id
              AND status <> 'CANCELLED'
              AND @status <> 'CANCELLED'
              AND @start_time < end_time
              AND @end_time > start_time
        )
        BEGIN
            RAISERROR(N'Lịch chiếu bị trùng với một suất chiếu khác trong cùng phòng.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        INSERT INTO showtimes (
            movie_id,
            room_id,
            start_time,
            end_time,
            base_price,
            status
        )
        VALUES (
            @movie_id,
            @room_id,
            @start_time,
            @end_time,
            @base_price,
            @status
        );

        DECLARE @showtime_id INT = SCOPE_IDENTITY();

        EXEC sp_generate_showtime_seats @showtime_id = @showtime_id;

        COMMIT TRANSACTION;

        SELECT *
        FROM showtimes
        WHERE showtime_id = @showtime_id;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO


/* =========================================================
   21. PROCEDURE: GIỮ GHẾ TẠM THỜI
   ========================================================= */

CREATE PROCEDURE sp_hold_seat
    @user_id INT,
    @showtime_seat_id INT,
    @hold_minutes INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 
            FROM users 
            WHERE user_id = @user_id 
              AND status = 'ACTIVE'
        )
        BEGIN
            RAISERROR(N'Người dùng không tồn tại hoặc bị khóa.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        DECLARE @expires_at DATETIME = DATEADD(MINUTE, @hold_minutes, GETDATE());

        -- Nếu ghế đang HELD nhưng hold đã hết hạn, tự dọn trước khi kiểm tra.
        UPDATE sh
        SET sh.status = 'EXPIRED'
        FROM seat_holds sh
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.showtime_seat_id = @showtime_seat_id
          AND sh.status = 'ACTIVE'
          AND (
              sh.expired_at <= GETDATE()
              OR ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss WITH (UPDLOCK, ROWLOCK)
        WHERE ss.showtime_seat_id = @showtime_seat_id
          AND ss.status = 'HELD'
          AND (
              ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        IF NOT EXISTS (
            SELECT 1
            FROM showtime_seats WITH (UPDLOCK, ROWLOCK)
            WHERE showtime_seat_id = @showtime_seat_id
              AND status = 'AVAILABLE'
        )
        BEGIN
            RAISERROR(N'Ghế không còn trống.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        UPDATE showtime_seats
        SET status = 'HELD',
            held_by_user_id = @user_id,
            hold_expires_at = @expires_at
        WHERE showtime_seat_id = @showtime_seat_id;

        INSERT INTO seat_holds (
            user_id,
            showtime_seat_id,
            hold_token,
            expired_at,
            status
        )
        VALUES (
            @user_id,
            @showtime_seat_id,
            CONCAT('HOLD-', NEWID()),
            @expires_at,
            'ACTIVE'
        );

        COMMIT TRANSACTION;

        SELECT 
            hold_id,
            user_id,
            showtime_seat_id,
            hold_token,
            expired_at,
            status
        FROM seat_holds
        WHERE hold_id = SCOPE_IDENTITY();

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/* =========================================================
   21.1 PROCEDURE: GIỮ NHIỀU GHẾ TẠM THỜI TRONG CÙNG TRANSACTION
   @showtime_seat_ids: chuỗi ID cách nhau bằng dấu phẩy, ví dụ '1,2,3'.
   Dùng cho API chọn nhiều ghế của backend NestJS/Express.
   ========================================================= */

CREATE PROCEDURE sp_hold_seats
    @user_id INT,
    @showtime_seat_ids VARCHAR(MAX),
    @hold_minutes INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = @user_id
              AND status = 'ACTIVE'
        )
        BEGIN
            RAISERROR(N'Người dùng không tồn tại hoặc bị khóa.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        DECLARE @requested_count INT;
        DECLARE @valid_count INT;
        DECLARE @showtime_count INT;
        DECLARE @expires_at DATETIME = DATEADD(MINUTE, @hold_minutes, GETDATE());

        DECLARE @seat_list TABLE (
            showtime_seat_id INT PRIMARY KEY
        );

        INSERT INTO @seat_list (showtime_seat_id)
        SELECT DISTINCT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@showtime_seat_ids, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL;

        SELECT @requested_count = COUNT(*)
        FROM @seat_list;

        IF @requested_count IS NULL OR @requested_count = 0
        BEGIN
            RAISERROR(N'Danh sách ghế cần giữ không hợp lệ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- Tự expire các hold đã quá hạn trong đúng danh sách ghế đang được yêu cầu.
        UPDATE sh
        SET sh.status = 'EXPIRED'
        FROM seat_holds sh
        INNER JOIN @seat_list sl
            ON sh.showtime_seat_id = sl.showtime_seat_id
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.status = 'ACTIVE'
          AND (
              sh.expired_at <= GETDATE()
              OR ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss WITH (UPDLOCK, ROWLOCK)
        INNER JOIN @seat_list sl
            ON ss.showtime_seat_id = sl.showtime_seat_id
        WHERE ss.status = 'HELD'
          AND (
              ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        SELECT
            @valid_count = COUNT(*),
            @showtime_count = COUNT(DISTINCT ss.showtime_id)
        FROM @seat_list sl
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sl.showtime_seat_id = ss.showtime_seat_id
        WHERE ss.status = 'AVAILABLE';

        IF @valid_count <> @requested_count
        BEGIN
            RAISERROR(N'Một hoặc nhiều ghế không còn trống.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF @showtime_count <> 1
        BEGIN
            RAISERROR(N'Các ghế cần giữ phải thuộc cùng một suất chiếu.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        UPDATE ss
        SET ss.status = 'HELD',
            ss.held_by_user_id = @user_id,
            ss.hold_expires_at = @expires_at
        FROM showtime_seats ss
        INNER JOIN @seat_list sl
            ON ss.showtime_seat_id = sl.showtime_seat_id;

        INSERT INTO seat_holds (
            user_id,
            showtime_seat_id,
            hold_token,
            expired_at,
            status
        )
        SELECT
            @user_id,
            sl.showtime_seat_id,
            CONCAT('HOLD-', NEWID()),
            @expires_at,
            'ACTIVE'
        FROM @seat_list sl;

        COMMIT TRANSACTION;

        SELECT
            sh.hold_id,
            sh.user_id,
            sh.showtime_seat_id,
            sh.hold_token,
            sh.expired_at,
            sh.status
        FROM seat_holds sh
        INNER JOIN @seat_list sl
            ON sh.showtime_seat_id = sl.showtime_seat_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND sh.expired_at = @expires_at
        ORDER BY sh.hold_id;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/* =========================================================
   22. PROCEDURE: HỦY / HẾT HẠN GIỮ GHẾ
   ========================================================= */

CREATE PROCEDURE sp_expire_seat_holds
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss
        INNER JOIN seat_holds sh
            ON ss.showtime_seat_id = sh.showtime_seat_id
        WHERE sh.status = 'ACTIVE'
          AND sh.expired_at < GETDATE()
          AND ss.status = 'HELD';

        UPDATE seat_holds
        SET status = 'EXPIRED'
        WHERE status = 'ACTIVE'
          AND expired_at < GETDATE();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/* =========================================================
   23. PROCEDURE: TẠO ĐƠN ĐẶT VÉ TỪ GHẾ ĐÃ GIỮ
   Bản đơn giản: tạo booking cho 1 ghế.
   ========================================================= */

CREATE PROCEDURE sp_create_booking_from_hold
    @user_id INT,
    @hold_id INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @showtime_seat_id INT;
        DECLARE @showtime_id INT;
        DECLARE @seat_price DECIMAL(10,2);
        DECLARE @booking_id INT;
        DECLARE @booking_expires_at DATETIME = DATEADD(MINUTE, 10, GETDATE());

        -- Nếu hold đã hết hạn thì đồng bộ lại cả seat_holds và showtime_seats.
        UPDATE sh
        SET sh.status = 'EXPIRED'
        FROM seat_holds sh
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.hold_id = @hold_id
          AND sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND (
              sh.expired_at <= GETDATE()
              OR ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss WITH (UPDLOCK, ROWLOCK)
        INNER JOIN seat_holds sh
            ON ss.showtime_seat_id = sh.showtime_seat_id
        WHERE sh.hold_id = @hold_id
          AND sh.user_id = @user_id
          AND sh.status = 'EXPIRED'
          AND ss.status = 'HELD'
          AND (
              ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        SELECT 
            @showtime_seat_id = sh.showtime_seat_id,
            @showtime_id = ss.showtime_id,
            @seat_price = ss.price
        FROM seat_holds sh WITH (UPDLOCK, ROWLOCK)
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.hold_id = @hold_id
          AND sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND sh.expired_at > GETDATE()
          AND ss.status = 'HELD'
          AND ss.held_by_user_id = @user_id
          AND ss.hold_expires_at > GETDATE();

        IF @showtime_seat_id IS NULL
        BEGIN
            RAISERROR(N'Ghế giữ không tồn tại, không thuộc người dùng này hoặc đã hết hạn.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        INSERT INTO booking_orders (
            user_id,
            showtime_id,
            booking_code,
            total_amount,
            final_amount,
            status,
            expired_at
        )
        VALUES (
            @user_id,
            @showtime_id,
            CONCAT('BOOK-', FORMAT(GETDATE(), 'yyyyMMddHHmmss'), '-', ABS(CHECKSUM(NEWID()))),
            @seat_price,
            @seat_price,
            'PENDING_PAYMENT',
            @booking_expires_at
        );

        SET @booking_id = SCOPE_IDENTITY();

        INSERT INTO booking_details (
            booking_id,
            showtime_seat_id,
            seat_price
        )
        VALUES (
            @booking_id,
            @showtime_seat_id,
            @seat_price
        );

        -- Sau khi chuyển sang checkout, gia hạn hold theo hạn thanh toán của booking.
        UPDATE showtime_seats
        SET hold_expires_at = @booking_expires_at
        WHERE showtime_seat_id = @showtime_seat_id
          AND status = 'HELD'
          AND held_by_user_id = @user_id;

        UPDATE seat_holds
        SET expired_at = @booking_expires_at
        WHERE hold_id = @hold_id
          AND user_id = @user_id
          AND status = 'ACTIVE';

        COMMIT TRANSACTION;

        SELECT *
        FROM booking_orders
        WHERE booking_id = @booking_id;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO


/* =========================================================
   23.1 PROCEDURE: TẠO ĐƠN TỪ NHIỀU GHẾ ĐÃ GIỮ
   @hold_ids: chuỗi ID cách nhau bằng dấu phẩy, ví dụ '1,2,3'.
   ========================================================= */

CREATE PROCEDURE sp_create_booking_from_holds
    @user_id INT,
    @hold_ids VARCHAR(MAX),
    @combo_id INT = NULL,
    @combo_quantity INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @booking_id INT;
        DECLARE @booking_expires_at DATETIME = DATEADD(MINUTE, 10, GETDATE());
        DECLARE @showtime_id INT;
        DECLARE @seat_total DECIMAL(10,2);
        DECLARE @combo_price DECIMAL(10,2) = NULL;
        DECLARE @combo_total DECIMAL(10,2) = 0;
        DECLARE @final_amount DECIMAL(10,2);
        DECLARE @requested_count INT;
        DECLARE @valid_count INT;
        DECLARE @showtime_count INT;

        DECLARE @hold_list TABLE (
            hold_id INT PRIMARY KEY
        );

        INSERT INTO @hold_list (hold_id)
        SELECT DISTINCT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@hold_ids, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL;

        SELECT @requested_count = COUNT(*)
        FROM @hold_list;

        IF @requested_count IS NULL OR @requested_count = 0
        BEGIN
            RAISERROR(N'Danh sách ghế giữ không hợp lệ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- Đồng bộ các hold đã hết hạn trước khi tạo booking.
        UPDATE sh
        SET sh.status = 'EXPIRED'
        FROM seat_holds sh
        INNER JOIN @hold_list hl
            ON sh.hold_id = hl.hold_id
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND (
              sh.expired_at <= GETDATE()
              OR ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        UPDATE ss
        SET ss.status = 'AVAILABLE',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss WITH (UPDLOCK, ROWLOCK)
        INNER JOIN seat_holds sh
            ON ss.showtime_seat_id = sh.showtime_seat_id
        INNER JOIN @hold_list hl
            ON sh.hold_id = hl.hold_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'EXPIRED'
          AND ss.status = 'HELD'
          AND (
              ss.hold_expires_at IS NULL
              OR ss.hold_expires_at <= GETDATE()
          );

        SELECT
            @valid_count = COUNT(*),
            @showtime_count = COUNT(DISTINCT ss.showtime_id),
            @showtime_id = MIN(ss.showtime_id),
            @seat_total = SUM(ss.price)
        FROM @hold_list hl
        INNER JOIN seat_holds sh WITH (UPDLOCK, ROWLOCK)
            ON hl.hold_id = sh.hold_id
        INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND sh.expired_at > GETDATE()
          AND ss.status = 'HELD'
          AND ss.held_by_user_id = @user_id
          AND ss.hold_expires_at > GETDATE();

        IF @valid_count <> @requested_count
        BEGIN
            RAISERROR(N'Một hoặc nhiều ghế giữ không hợp lệ, không thuộc người dùng này hoặc đã hết hạn.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF @showtime_count <> 1
        BEGIN
            RAISERROR(N'Các ghế giữ phải thuộc cùng một suất chiếu.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF @combo_id IS NOT NULL AND @combo_quantity > 0
        BEGIN
            SELECT @combo_price = price
            FROM concession_combos
            WHERE combo_id = @combo_id
              AND status = 'ACTIVE';

            IF @combo_price IS NULL
            BEGIN
                RAISERROR(N'Combo không tồn tại hoặc đã ngừng bán.', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END;

            SET @combo_total = @combo_price * @combo_quantity;
        END;

        SET @final_amount = ISNULL(@seat_total, 0) + ISNULL(@combo_total, 0);

        INSERT INTO booking_orders (
            user_id,
            showtime_id,
            booking_code,
            total_amount,
            final_amount,
            status,
            expired_at
        )
        VALUES (
            @user_id,
            @showtime_id,
            CONCAT('BOOK-', FORMAT(GETDATE(), 'yyyyMMddHHmmss'), '-', ABS(CHECKSUM(NEWID()))),
            @final_amount,
            @final_amount,
            'PENDING_PAYMENT',
            @booking_expires_at
        );

        SET @booking_id = SCOPE_IDENTITY();

        INSERT INTO booking_details (
            booking_id,
            showtime_seat_id,
            seat_price
        )
        SELECT
            @booking_id,
            sh.showtime_seat_id,
            ss.price
        FROM @hold_list hl
        INNER JOIN seat_holds sh
            ON hl.hold_id = sh.hold_id
        INNER JOIN showtime_seats ss
            ON sh.showtime_seat_id = ss.showtime_seat_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'ACTIVE'
          AND sh.expired_at > GETDATE()
          AND ss.status = 'HELD'
          AND ss.held_by_user_id = @user_id
          AND ss.hold_expires_at > GETDATE();

        -- Sau khi chuyển sang checkout, gia hạn tất cả hold theo hạn thanh toán của booking.
        UPDATE ss
        SET ss.hold_expires_at = @booking_expires_at
        FROM showtime_seats ss
        INNER JOIN booking_details bd
            ON ss.showtime_seat_id = bd.showtime_seat_id
        WHERE bd.booking_id = @booking_id
          AND ss.status = 'HELD'
          AND ss.held_by_user_id = @user_id;

        UPDATE sh
        SET sh.expired_at = @booking_expires_at
        FROM seat_holds sh
        INNER JOIN @hold_list hl
            ON sh.hold_id = hl.hold_id
        WHERE sh.user_id = @user_id
          AND sh.status = 'ACTIVE';

        IF @combo_id IS NOT NULL AND @combo_quantity > 0
        BEGIN
            INSERT INTO booking_combos (
                booking_id,
                combo_id,
                quantity,
                unit_price
            )
            VALUES (
                @booking_id,
                @combo_id,
                @combo_quantity,
                @combo_price
            );
        END;

        COMMIT TRANSACTION;

        SELECT *
        FROM booking_orders
        WHERE booking_id = @booking_id;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO


/* =========================================================
   23.2 PROCEDURE: GỢI Ý SUẤT CHIẾU / GHẾ / COMBO CHO FORM SĂN VÉ
   Khớp với frontend React: movieName, date, theater, seatPreference,
   tickets, budget, wantsCombo.
   ========================================================= */

CREATE PROCEDURE sp_find_ticket_suggestions
    @movie_name NVARCHAR(200) = NULL,
    @preferred_date DATE = NULL,
    @theater NVARCHAR(150) = NULL,
    @seat_preference VARCHAR(20) = 'middle',
    @ticket_quantity INT = 2,
    @max_budget DECIMAL(10,2) = NULL,
    @wants_combo BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @ticket_quantity IS NULL OR @ticket_quantity <= 0
        SET @ticket_quantity = 1;

    ;WITH candidate_showtimes AS (
        SELECT
            st.showtime_id,
            m.title AS movie_title,
            c.cinema_name,
            r.room_name,
            st.start_time,
            st.end_time,
            st.base_price,
            COUNT(ss.showtime_seat_id) AS available_seats
        FROM showtimes st
        INNER JOIN movies m
            ON st.movie_id = m.movie_id
        INNER JOIN rooms r
            ON st.room_id = r.room_id
        INNER JOIN cinemas c
            ON r.cinema_id = c.cinema_id
        INNER JOIN showtime_seats ss
            ON st.showtime_id = ss.showtime_id
        INNER JOIN seats s
            ON ss.seat_id = s.seat_id
        WHERE st.status = 'OPEN'
          AND ss.status = 'AVAILABLE'
          AND (@movie_name IS NULL OR m.title LIKE N'%' + @movie_name + N'%')
          AND (@preferred_date IS NULL OR CAST(st.start_time AS DATE) = @preferred_date)
          AND (@theater IS NULL OR c.cinema_name LIKE N'%' + @theater + N'%')
        GROUP BY
            st.showtime_id,
            m.title,
            c.cinema_name,
            r.room_name,
            st.start_time,
            st.end_time,
            st.base_price
        HAVING COUNT(ss.showtime_seat_id) >= @ticket_quantity
    ), ranked_showtimes AS (
        SELECT TOP 10 *
        FROM candidate_showtimes
        ORDER BY start_time ASC, base_price ASC
    ), picked_seats AS (
        SELECT
            rs.showtime_id,
            ss.showtime_seat_id,
            CONCAT(s.seat_row, s.seat_number) AS seat_label,
            ss.price,
            ROW_NUMBER() OVER (
                PARTITION BY rs.showtime_id
                ORDER BY
                    CASE
                        WHEN @seat_preference = 'back' THEN s.seat_row
                    END DESC,
                    CASE
                        WHEN @seat_preference = 'front' THEN s.seat_row
                    END ASC,
                    CASE
                        WHEN @seat_preference = 'middle' THEN ABS(ASCII(UPPER(LEFT(s.seat_row, 1))) - ASCII('F'))
                        ELSE 0
                    END ASC,
                    s.seat_number ASC
            ) AS rn
        FROM ranked_showtimes rs
        INNER JOIN showtime_seats ss
            ON rs.showtime_id = ss.showtime_id
        INNER JOIN seats s
            ON ss.seat_id = s.seat_id
        WHERE ss.status = 'AVAILABLE'
    ), seat_summary AS (
        SELECT
            showtime_id,
            STRING_AGG(seat_label, ', ') AS suggested_seats,
            SUM(price) AS ticket_total
        FROM picked_seats
        WHERE rn <= @ticket_quantity
        GROUP BY showtime_id
    ), combo_choice AS (
        SELECT TOP 1
            combo_id,
            combo_name,
            price AS combo_price
        FROM concession_combos
        WHERE status = 'ACTIVE'
        ORDER BY price ASC
    )
    SELECT
        rs.showtime_id,
        rs.movie_title,
        rs.cinema_name,
        rs.room_name,
        rs.start_time,
        rs.end_time,
        ss.suggested_seats,
        @ticket_quantity AS ticket_quantity,
        ss.ticket_total,
        CASE WHEN @wants_combo = 1 THEN cc.combo_id ELSE NULL END AS combo_id,
        CASE WHEN @wants_combo = 1 THEN cc.combo_name ELSE NULL END AS combo_name,
        CASE WHEN @wants_combo = 1 THEN cc.combo_price ELSE 0 END AS combo_price,
        ss.ticket_total + CASE WHEN @wants_combo = 1 THEN ISNULL(cc.combo_price, 0) ELSE 0 END AS estimated_total,
        CASE
            WHEN @max_budget IS NULL THEN 1
            WHEN ss.ticket_total + CASE WHEN @wants_combo = 1 THEN ISNULL(cc.combo_price, 0) ELSE 0 END <= @max_budget THEN 1
            ELSE 0
        END AS within_budget
    FROM ranked_showtimes rs
    INNER JOIN seat_summary ss
        ON rs.showtime_id = ss.showtime_id
    OUTER APPLY (
        SELECT TOP 1 combo_id, combo_name, combo_price
        FROM combo_choice
    ) cc
    WHERE @max_budget IS NULL
       OR ss.ticket_total + CASE WHEN @wants_combo = 1 THEN ISNULL(cc.combo_price, 0) ELSE 0 END <= @max_budget
    ORDER BY estimated_total ASC, rs.start_time ASC;
END;
GO

/* =========================================================
   24. PROCEDURE: THANH TOÁN THÀNH CÔNG
   Sau khi thanh toán:
   - booking -> ISSUED
   - payment -> SUCCESS
   - ghế -> SOLD
   - hold -> CONFIRMED
   - sinh ticket QR
   ========================================================= */

CREATE PROCEDURE sp_confirm_payment
    @booking_id INT,
    @payment_method VARCHAR(30),
    @transaction_code VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @total_amount DECIMAL(10,2);

        SELECT @total_amount = final_amount
        FROM booking_orders
        WHERE booking_id = @booking_id
          AND status = 'PENDING_PAYMENT'
          AND (expired_at IS NULL OR expired_at > GETDATE());

        IF @total_amount IS NULL
        BEGIN
            RAISERROR(N'Đơn đặt vé không hợp lệ hoặc đã hết hạn.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF EXISTS (
            SELECT 1
            FROM booking_orders bo
            INNER JOIN booking_details bd
                ON bo.booking_id = bd.booking_id
            INNER JOIN showtime_seats ss WITH (UPDLOCK, ROWLOCK)
                ON bd.showtime_seat_id = ss.showtime_seat_id
            WHERE bo.booking_id = @booking_id
              AND (
                  ss.status <> 'HELD'
                  OR ss.held_by_user_id <> bo.user_id
                  OR ss.hold_expires_at IS NULL
                  OR ss.hold_expires_at <= GETDATE()
              )
        )
        BEGIN
            RAISERROR(N'Ghế của đơn đặt vé không còn được giữ hợp lệ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        INSERT INTO payments (
            booking_id,
            payment_method,
            amount,
            transaction_code,
            payment_status,
            paid_at
        )
        VALUES (
            @booking_id,
            @payment_method,
            @total_amount,
            @transaction_code,
            'SUCCESS',
            GETDATE()
        );

        UPDATE booking_orders
        SET status = 'ISSUED'
        WHERE booking_id = @booking_id;

        UPDATE ss
        SET ss.status = 'SOLD',
            ss.held_by_user_id = NULL,
            ss.hold_expires_at = NULL
        FROM showtime_seats ss
        INNER JOIN booking_details bd
            ON ss.showtime_seat_id = bd.showtime_seat_id
        WHERE bd.booking_id = @booking_id;

        UPDATE sh
        SET sh.status = 'CONFIRMED'
        FROM seat_holds sh
        INNER JOIN booking_details bd
            ON sh.showtime_seat_id = bd.showtime_seat_id
        WHERE bd.booking_id = @booking_id
          AND sh.status = 'ACTIVE';

        INSERT INTO tickets (
            booking_detail_id,
            ticket_code,
            qr_code,
            ticket_status
        )
        SELECT
            bd.booking_detail_id,
            CONCAT('TICKET-', FORMAT(GETDATE(), 'yyyyMMddHHmmss'), '-', ABS(CHECKSUM(NEWID()))),
            CONCAT('QR-', NEWID()),
            'VALID'
        FROM booking_details bd
        WHERE bd.booking_id = @booking_id
          AND NOT EXISTS (
              SELECT 1
              FROM tickets t
              WHERE t.booking_detail_id = bd.booking_detail_id
          );

        COMMIT TRANSACTION;

        SELECT *
        FROM tickets t
        INNER JOIN booking_details bd
            ON t.booking_detail_id = bd.booking_detail_id
        WHERE bd.booking_id = @booking_id;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/* =========================================================
   25. PROCEDURE: CHECK-IN VÉ
   ========================================================= */

CREATE PROCEDURE sp_checkin_ticket
    @ticket_code VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM tickets
        WHERE ticket_code = @ticket_code
          AND ticket_status = 'VALID'
    )
    BEGIN
        RAISERROR(N'Vé không hợp lệ hoặc đã được sử dụng.', 16, 1);
        RETURN;
    END;

    UPDATE tickets
    SET ticket_status = 'USED',
        checked_in_at = GETDATE()
    WHERE ticket_code = @ticket_code
      AND ticket_status = 'VALID';

    SELECT *
    FROM tickets
    WHERE ticket_code = @ticket_code;
END;
GO

/* =========================================================
   26. VIEW: XEM SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
   ========================================================= */

CREATE VIEW vw_showtime_seat_map
AS
SELECT
    ss.showtime_seat_id,
    st.showtime_id,
    m.title AS movie_title,
    c.cinema_name,
    r.room_name,
    s.seat_row,
    s.seat_number,
    s.seat_type,
    ss.status AS seat_status,
    ss.price,
    ss.held_by_user_id,
    ss.hold_expires_at,
    st.start_time,
    st.end_time
FROM showtime_seats ss
INNER JOIN showtimes st
    ON ss.showtime_id = st.showtime_id
INNER JOIN movies m
    ON st.movie_id = m.movie_id
INNER JOIN rooms r
    ON st.room_id = r.room_id
INNER JOIN cinemas c
    ON r.cinema_id = c.cinema_id
INNER JOIN seats s
    ON ss.seat_id = s.seat_id;
GO

/* =========================================================
   27. VIEW: DANH SÁCH BOOKING
   ========================================================= */

CREATE VIEW vw_booking_summary
AS
SELECT
    bo.booking_id,
    bo.booking_code,
    u.full_name,
    u.email,
    m.title AS movie_title,
    c.cinema_name,
    r.room_name,
    st.start_time,
    bo.total_amount,
    bo.discount_amount,
    bo.final_amount,
    bo.status AS booking_status,
    bo.created_at
FROM booking_orders bo
INNER JOIN users u
    ON bo.user_id = u.user_id
INNER JOIN showtimes st
    ON bo.showtime_id = st.showtime_id
INNER JOIN movies m
    ON st.movie_id = m.movie_id
INNER JOIN rooms r
    ON st.room_id = r.room_id
INNER JOIN cinemas c
    ON r.cinema_id = c.cinema_id;
GO

/* =========================================================
   28. VIEW: DOANH THU THEO NGÀY
   ========================================================= */

CREATE VIEW vw_daily_revenue
AS
SELECT
    CAST(p.paid_at AS DATE) AS revenue_date,
    COUNT(DISTINCT bo.booking_id) AS total_bookings,
    SUM(p.amount) AS total_revenue
FROM payments p
INNER JOIN booking_orders bo
    ON p.booking_id = bo.booking_id
WHERE p.payment_status = 'SUCCESS'
GROUP BY CAST(p.paid_at AS DATE);
GO

/* =========================================================
   29. DỮ LIỆU MẪU
   ========================================================= */

INSERT INTO users (
    full_name,
    email,
    phone,
    password_hash,
    role,
    status
)
VALUES
(N'Nguyễn Văn Admin', 'admin@gmail.com', '0900000001', 'hashed_password_admin', 'ADMIN', 'ACTIVE'),
(N'Trần Thị Staff', 'staff@gmail.com', '0900000002', 'hashed_password_staff', 'STAFF', 'ACTIVE'),
(N'Lê Văn Khách', 'customer@gmail.com', '0900000003', 'hashed_password_customer', 'CUSTOMER', 'ACTIVE');
GO

INSERT INTO genres (genre_name)
VALUES
(N'Hành động'),
(N'Tình cảm'),
(N'Kinh dị'),
(N'Hoạt hình'),
(N'Khoa học viễn tưởng');
GO

INSERT INTO movies (
    title,
    description,
    duration_minutes,
    age_rating,
    release_date,
    poster_url,
    trailer_url,
    status
)
VALUES
(N'Lật Mặt 9', N'Phim hành động Việt Nam.', 120, 'T16', '2026-05-01', 'poster_latmat9.jpg', 'trailer_latmat9.mp4', 'NOW_SHOWING'),
(N'Doraemon Movie 2026', N'Phim hoạt hình gia đình.', 105, 'P', '2026-06-01', 'poster_doraemon.jpg', 'trailer_doraemon.mp4', 'NOW_SHOWING'),
(N'Avengers: New Era', N'Phim siêu anh hùng.', 140, 'T13', '2026-07-15', 'poster_avengers.jpg', 'trailer_avengers.mp4', 'COMING_SOON');
GO

INSERT INTO movie_genres (movie_id, genre_id)
VALUES
(1, 1),
(2, 4),
(3, 1),
(3, 5);
GO

INSERT INTO cinemas (
    cinema_name,
    address,
    city,
    phone,
    status
)
VALUES
(N'CMC Cinema Thái Nguyên', N'Đường Cách Mạng Tháng 8, Thái Nguyên', N'Thái Nguyên', '0208000001', 'ACTIVE'),
(N'CMC Cinema Hà Nội', N'Cầu Giấy, Hà Nội', N'Hà Nội', '0240000002', 'ACTIVE');
GO

INSERT INTO rooms (
    cinema_id,
    room_name,
    total_seats,
    room_type,
    status
)
VALUES
(1, N'Phòng 1', 20, 'STANDARD', 'ACTIVE'),
(1, N'Phòng VIP 1', 20, 'VIP', 'ACTIVE'),
(2, N'Phòng IMAX 1', 20, 'IMAX', 'ACTIVE');
GO

/* Tạo ghế mẫu cho phòng 1: A1-A10, B1-B10 */
INSERT INTO seats (room_id, seat_row, seat_number, seat_type, status)
VALUES
(1, 'A', 1, 'NORMAL', 'ACTIVE'),
(1, 'A', 2, 'NORMAL', 'ACTIVE'),
(1, 'A', 3, 'NORMAL', 'ACTIVE'),
(1, 'A', 4, 'NORMAL', 'ACTIVE'),
(1, 'A', 5, 'NORMAL', 'ACTIVE'),
(1, 'A', 6, 'VIP', 'ACTIVE'),
(1, 'A', 7, 'VIP', 'ACTIVE'),
(1, 'A', 8, 'VIP', 'ACTIVE'),
(1, 'A', 9, 'VIP', 'ACTIVE'),
(1, 'A', 10, 'VIP', 'ACTIVE'),
(1, 'B', 1, 'NORMAL', 'ACTIVE'),
(1, 'B', 2, 'NORMAL', 'ACTIVE'),
(1, 'B', 3, 'NORMAL', 'ACTIVE'),
(1, 'B', 4, 'NORMAL', 'ACTIVE'),
(1, 'B', 5, 'NORMAL', 'ACTIVE'),
(1, 'B', 6, 'COUPLE', 'ACTIVE'),
(1, 'B', 7, 'COUPLE', 'ACTIVE'),
(1, 'B', 8, 'COUPLE', 'ACTIVE'),
(1, 'B', 9, 'COUPLE', 'ACTIVE'),
(1, 'B', 10, 'COUPLE', 'ACTIVE');
GO

/* Tạo ghế mẫu cho phòng 2 */
INSERT INTO seats (room_id, seat_row, seat_number, seat_type, status)
SELECT
    2,
    seat_row,
    seat_number,
    seat_type,
    status
FROM seats
WHERE room_id = 1;
GO

/* Tạo ghế mẫu cho phòng 3 */
INSERT INTO seats (room_id, seat_row, seat_number, seat_type, status)
SELECT
    3,
    seat_row,
    seat_number,
    seat_type,
    status
FROM seats
WHERE room_id = 1;
GO

INSERT INTO showtimes (
    movie_id,
    room_id,
    start_time,
    end_time,
    base_price,
    status
)
VALUES
(1, 1, '2026-06-10 18:00:00', '2026-06-10 20:00:00', 80000, 'OPEN'),
(2, 2, '2026-06-10 19:00:00', '2026-06-10 20:45:00', 90000, 'OPEN'),
(3, 3, '2026-07-16 20:00:00', '2026-07-16 22:20:00', 120000, 'OPEN');
GO

/* Sinh ghế theo từng suất chiếu */
EXEC sp_generate_showtime_seats @showtime_id = 1;
EXEC sp_generate_showtime_seats @showtime_id = 2;
EXEC sp_generate_showtime_seats @showtime_id = 3;
GO

INSERT INTO concession_combos (
    combo_name,
    description,
    price,
    status
)
VALUES
(N'Combo 1 bắp + 2 nước', N'01 bắp rang bơ và 02 nước ngọt.', 95000, 'ACTIVE'),
(N'Combo cặp đôi', N'01 bắp lớn và 02 nước lớn.', 120000, 'ACTIVE');
GO

INSERT INTO ticket_watch_requests (
    user_id,
    movie_id,
    cinema_id,
    preferred_date,
    preferred_time_from,
    preferred_time_to,
    preferred_seat_type,
    seat_preference,
    ticket_quantity,
    max_budget,
    wants_combo,
    status
)
VALUES
(3, 1, 1, '2026-06-10', '18:00:00', '21:00:00', 'VIP', 'middle', 2, 200000, 1, 'ACTIVE');
GO

INSERT INTO notifications (
    user_id,
    title,
    message,
    notification_type,
    is_read
)
VALUES
(3, N'Chào mừng bạn đến với hệ thống săn vé', N'Bạn có thể săn vé theo phim, rạp, ngày chiếu và loại ghế mong muốn.', 'SYSTEM', 0);
GO

