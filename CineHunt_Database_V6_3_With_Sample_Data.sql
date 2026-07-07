/* ============================================================================
   CINEHUNT DATABASE V6
   Hệ thống săn vé / đặt vé xem phim
   DBMS: Microsoft SQL Server
   Backend: NestJS + TypeORM
   Version: 6.3 (backend/frontend compatible - fixed column name mismatches)
   
   THAY ĐỔI V6.3 so với V6.2:
   - payments.CK_payments_method: bổ sung ZALOPAY, CREDIT_CARD (Frontend dùng)
   - booking_orders: thêm cột computed booking_status → ánh xạ entity NestJS
   - showtime_seats: thêm cột computed seat_status → ánh xạ entity NestJS
   - promotions: thêm cột computed voucher_status → ánh xạ entity NestJS
   ============================================================================ */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* ============================================================================
   0. TẠO DATABASE
   Đổi @ResetDatabase = 1 nếu muốn xóa database cũ và tạo lại từ đầu.
   ============================================================================ */

DECLARE @ResetDatabase BIT = 0;

IF DB_ID(N'CineHuntDB') IS NOT NULL AND @ResetDatabase = 1
BEGIN
    ALTER DATABASE CineHuntDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE CineHuntDB;
END;
GO

IF DB_ID(N'CineHuntDB') IS NULL
BEGIN
    CREATE DATABASE CineHuntDB;
END;
GO

USE CineHuntDB;
GO

/* ============================================================================
   1. XÓA OBJECT CŨ KHI CHẠY LẠI SCRIPT
   ============================================================================ */

DROP VIEW IF EXISTS dbo.vw_daily_revenue;
DROP VIEW IF EXISTS dbo.vw_booking_summary;
DROP VIEW IF EXISTS dbo.vw_showtime_seat_map;
GO

DROP PROCEDURE IF EXISTS dbo.sp_sync_user_role;
DROP PROCEDURE IF EXISTS dbo.sp_checkin_ticket;
DROP PROCEDURE IF EXISTS dbo.sp_confirm_payment;
DROP PROCEDURE IF EXISTS dbo.sp_create_booking;
DROP PROCEDURE IF EXISTS dbo.sp_release_expired_holds;
DROP PROCEDURE IF EXISTS dbo.sp_hold_seats;
DROP PROCEDURE IF EXISTS dbo.sp_find_ticket_suggestions;
DROP PROCEDURE IF EXISTS dbo.sp_create_showtime;
DROP PROCEDURE IF EXISTS dbo.sp_generate_showtime_seats;
GO

DROP TRIGGER IF EXISTS dbo.trg_users_sync_role;
DROP TRIGGER IF EXISTS dbo.trg_showtimes_prevent_overlap;
DROP TRIGGER IF EXISTS dbo.trg_movies_updated_at;
DROP TRIGGER IF EXISTS dbo.trg_booking_orders_updated_at;
DROP TRIGGER IF EXISTS dbo.trg_payments_updated_at;
DROP TRIGGER IF EXISTS dbo.trg_showtimes_updated_at;
DROP TRIGGER IF EXISTS dbo.trg_users_updated_at;
GO

/* Xóa bảng theo thứ tự phụ thuộc khóa ngoại */
DROP TABLE IF EXISTS dbo.audit_logs;
DROP TABLE IF EXISTS dbo.notifications;
DROP TABLE IF EXISTS dbo.ticket_watch_requests;
DROP TABLE IF EXISTS dbo.otp_codes;
DROP TABLE IF EXISTS dbo.tickets;
DROP TABLE IF EXISTS dbo.refunds;
DROP TABLE IF EXISTS dbo.payments;
DROP TABLE IF EXISTS dbo.booking_combos;
DROP TABLE IF EXISTS dbo.concession_combos;
DROP TABLE IF EXISTS dbo.booking_products;
DROP TABLE IF EXISTS dbo.products;
DROP TABLE IF EXISTS dbo.booking_details;
DROP TABLE IF EXISTS dbo.booking_orders;
DROP TABLE IF EXISTS dbo.seat_holds;
DROP TABLE IF EXISTS dbo.showtime_seats;
DROP TABLE IF EXISTS dbo.showtimes;
DROP TABLE IF EXISTS dbo.seats;
DROP TABLE IF EXISTS dbo.seat_types;
DROP TABLE IF EXISTS dbo.rooms;
DROP TABLE IF EXISTS dbo.cinemas;
DROP TABLE IF EXISTS dbo.movie_genres;
DROP TABLE IF EXISTS dbo.genres;
DROP TABLE IF EXISTS dbo.movies;
DROP TABLE IF EXISTS dbo.refresh_tokens;
DROP TABLE IF EXISTS dbo.user_roles;
DROP TABLE IF EXISTS dbo.roles;
DROP TABLE IF EXISTS dbo.users;
GO

/* ============================================================================
   2. NGƯỜI DÙNG VÀ PHÂN QUYỀN
   V6.2: giữ users.role để tương thích backend hiện tại; roles + user_roles hỗ trợ RBAC mở rộng.
   ============================================================================ */

CREATE TABLE dbo.users (
    user_id                 INT IDENTITY(1,1) NOT NULL,
    full_name               NVARCHAR(120) NOT NULL,
    email                   VARCHAR(150) NOT NULL,
    phone                   VARCHAR(20) NULL,
    password_hash           VARCHAR(255) NOT NULL,
    avatar_url              NVARCHAR(500) NULL,
    date_of_birth           DATE NULL,
    email_verified          BIT NOT NULL CONSTRAINT DF_users_email_verified DEFAULT 0,
    failed_login_attempts   INT NOT NULL CONSTRAINT DF_users_failed_login_attempts DEFAULT 0,
    locked_until            DATETIME2(0) NULL,
    last_login_at           DATETIME2(0) NULL,
    role                    VARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT 'CUSTOMER',
    status                  VARCHAR(20) NOT NULL CONSTRAINT DF_users_status DEFAULT 'ACTIVE',
    created_at              DATETIME2(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSDATETIME(),
    updated_at              DATETIME2(0) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_users PRIMARY KEY (user_id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_role CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),
    CONSTRAINT CK_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'BANNED', 'DELETED')),
    CONSTRAINT CK_users_failed_login_attempts CHECK (failed_login_attempts >= 0)
);
GO

CREATE UNIQUE INDEX UX_users_phone
ON dbo.users(phone)
WHERE phone IS NOT NULL;
GO

CREATE TABLE dbo.roles (
    role_id       INT IDENTITY(1,1) NOT NULL,
    role_code     VARCHAR(30) NOT NULL,
    role_name     NVARCHAR(80) NOT NULL,
    description   NVARCHAR(255) NULL,

    CONSTRAINT PK_roles PRIMARY KEY (role_id),
    CONSTRAINT UQ_roles_role_code UNIQUE (role_code),
    CONSTRAINT CK_roles_role_code CHECK (role_code IN ('CUSTOMER', 'STAFF', 'ADMIN'))
);
GO

CREATE TABLE dbo.user_roles (
    user_id      INT NOT NULL,
    role_id      INT NOT NULL,
    assigned_at  DATETIME2(0) NOT NULL CONSTRAINT DF_user_roles_assigned_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT FK_user_roles_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_user_roles_role FOREIGN KEY (role_id)
        REFERENCES dbo.roles(role_id) ON DELETE CASCADE
);
GO

CREATE OR ALTER PROCEDURE dbo.sp_sync_user_role
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @role_code VARCHAR(20);
    DECLARE @role_id INT;

    SELECT @role_code = role
    FROM dbo.users
    WHERE user_id = @user_id;

    IF @role_code IS NULL
        THROW 50001, N'Không tìm thấy người dùng.', 1;

    SELECT @role_id = role_id
    FROM dbo.roles
    WHERE role_code = @role_code;

    IF @role_id IS NULL
        THROW 50002, N'Role chưa được seed trong bảng roles.', 1;

    DELETE FROM dbo.user_roles
    WHERE user_id = @user_id
      AND role_id <> @role_id;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.user_roles
        WHERE user_id = @user_id AND role_id = @role_id
    )
    BEGIN
        INSERT INTO dbo.user_roles(user_id, role_id)
        VALUES (@user_id, @role_id);
    END;
END;
GO


/* Refresh token riêng cho từng thiết bị/phiên đăng nhập */
CREATE TABLE dbo.refresh_tokens (
    refresh_token_id BIGINT IDENTITY(1,1) NOT NULL,
    user_id           INT NOT NULL,
    token_hash        VARCHAR(255) NOT NULL,
    device_info       NVARCHAR(300) NULL,
    ip_address        VARCHAR(45) NULL,
    expires_at        DATETIME2(0) NOT NULL,
    revoked_at        DATETIME2(0) NULL,
    replaced_by_id    BIGINT NULL,
    created_at        DATETIME2(0) NOT NULL CONSTRAINT DF_refresh_tokens_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_refresh_tokens PRIMARY KEY (refresh_token_id),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_id)
        REFERENCES dbo.refresh_tokens(refresh_token_id),
    CONSTRAINT UQ_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT CK_refresh_tokens_expiry CHECK (expires_at > created_at)
);
GO

CREATE INDEX IX_refresh_tokens_user_active
ON dbo.refresh_tokens(user_id, expires_at)
WHERE revoked_at IS NULL;
GO

/* ============================================================================
   3. PHIM VÀ THỂ LOẠI
   ============================================================================ */

CREATE TABLE dbo.movies (
    movie_id          INT IDENTITY(1,1) NOT NULL,
    title             NVARCHAR(250) NOT NULL,
    original_title    NVARCHAR(250) NULL,
    description       NVARCHAR(MAX) NULL,
    duration_minutes  INT NOT NULL,
    release_date      DATE NULL,
    end_date          DATE NULL,
    age_rating        VARCHAR(10) NULL,
    director          NVARCHAR(150) NULL,
    actors            NVARCHAR(1000) NULL,
    country           NVARCHAR(100) NULL,
    language          NVARCHAR(100) NULL,
    poster_url        NVARCHAR(500) NULL,
    banner_url        NVARCHAR(500) NULL,
    trailer_url       NVARCHAR(500) NULL,
    average_rating    DECIMAL(3,2) NOT NULL CONSTRAINT DF_movies_average_rating DEFAULT 0,
    status            VARCHAR(20) NOT NULL CONSTRAINT DF_movies_status DEFAULT 'COMING_SOON',
    created_at        DATETIME2(0) NOT NULL CONSTRAINT DF_movies_created_at DEFAULT SYSDATETIME(),
    updated_at        DATETIME2(0) NOT NULL CONSTRAINT DF_movies_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_movies PRIMARY KEY (movie_id),
    CONSTRAINT CK_movies_duration CHECK (duration_minutes > 0),
    CONSTRAINT CK_movies_age_rating CHECK (
        age_rating IS NULL OR age_rating IN ('P', 'K', 'T13', 'T16', 'T18', 'C')
    ),
    CONSTRAINT CK_movies_average_rating CHECK (average_rating BETWEEN 0 AND 5),
    CONSTRAINT CK_movies_status CHECK (status IN ('COMING_SOON', 'NOW_SHOWING', 'ENDED', 'HIDDEN')),
    CONSTRAINT CK_movies_dates CHECK (end_date IS NULL OR release_date IS NULL OR end_date >= release_date)
);
GO

CREATE TABLE dbo.genres (
    genre_id    INT IDENTITY(1,1) NOT NULL,
    genre_name  NVARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NULL,

    CONSTRAINT PK_genres PRIMARY KEY (genre_id),
    CONSTRAINT UQ_genres_genre_name UNIQUE (genre_name)
);
GO

CREATE UNIQUE INDEX UX_genres_slug
ON dbo.genres(slug)
WHERE slug IS NOT NULL;
GO

CREATE TABLE dbo.movie_genres (
    movie_id  INT NOT NULL,
    genre_id  INT NOT NULL,

    CONSTRAINT PK_movie_genres PRIMARY KEY (movie_id, genre_id),
    CONSTRAINT FK_movie_genres_movie FOREIGN KEY (movie_id)
        REFERENCES dbo.movies(movie_id) ON DELETE CASCADE,
    CONSTRAINT FK_movie_genres_genre FOREIGN KEY (genre_id)
        REFERENCES dbo.genres(genre_id) ON DELETE CASCADE
);
GO

/* ============================================================================
   4. RẠP, PHÒNG, LOẠI GHẾ VÀ GHẾ
   ============================================================================ */

CREATE TABLE dbo.cinemas (
    cinema_id     INT IDENTITY(1,1) NOT NULL,
    cinema_name   NVARCHAR(180) NOT NULL,
    address       NVARCHAR(300) NOT NULL,
    city          NVARCHAR(100) NULL,
    district      NVARCHAR(100) NULL,
    phone         VARCHAR(20) NULL,
    latitude      DECIMAL(10,7) NULL,
    longitude     DECIMAL(10,7) NULL,
    status        VARCHAR(20) NOT NULL CONSTRAINT DF_cinemas_status DEFAULT 'ACTIVE',
    created_at    DATETIME2(0) NOT NULL CONSTRAINT DF_cinemas_created_at DEFAULT SYSDATETIME(),
    updated_at    DATETIME2(0) NOT NULL CONSTRAINT DF_cinemas_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_cinemas PRIMARY KEY (cinema_id),
    CONSTRAINT CK_cinemas_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'))
);
GO

CREATE TABLE dbo.rooms (
    room_id        INT IDENTITY(1,1) NOT NULL,
    cinema_id      INT NOT NULL,
    room_name      NVARCHAR(100) NOT NULL,
    room_type      VARCHAR(30) NOT NULL CONSTRAINT DF_rooms_type DEFAULT 'STANDARD',
    total_seats    INT NOT NULL CONSTRAINT DF_rooms_total_seats DEFAULT 0,
    status         VARCHAR(20) NOT NULL CONSTRAINT DF_rooms_status DEFAULT 'ACTIVE',
    created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_rooms_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_rooms PRIMARY KEY (room_id),
    CONSTRAINT FK_rooms_cinema FOREIGN KEY (cinema_id)
        REFERENCES dbo.cinemas(cinema_id),
    CONSTRAINT UQ_rooms_cinema_name UNIQUE (cinema_id, room_name),
    CONSTRAINT CK_rooms_type CHECK (room_type IN ('STANDARD', 'VIP', 'IMAX', '4DX')),
    CONSTRAINT CK_rooms_total_seats CHECK (total_seats >= 0),
    CONSTRAINT CK_rooms_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'))
);
GO

CREATE TABLE dbo.seat_types (
    seat_type_id     INT IDENTITY(1,1) NOT NULL,
    type_code        VARCHAR(30) NOT NULL,
    type_name        NVARCHAR(80) NOT NULL,
    price_multiplier DECIMAL(5,2) NOT NULL CONSTRAINT DF_seat_types_multiplier DEFAULT 1,
    status           VARCHAR(20) NOT NULL CONSTRAINT DF_seat_types_status DEFAULT 'ACTIVE',

    CONSTRAINT PK_seat_types PRIMARY KEY (seat_type_id),
    CONSTRAINT UQ_seat_types_code UNIQUE (type_code),
    CONSTRAINT CK_seat_types_multiplier CHECK (price_multiplier > 0),
    CONSTRAINT CK_seat_types_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

CREATE TABLE dbo.seats (
    seat_id       INT IDENTITY(1,1) NOT NULL,
    room_id       INT NOT NULL,
    seat_type_id  INT NOT NULL,
    seat_row      VARCHAR(5) NOT NULL,
    seat_number   INT NOT NULL,
    seat_label    VARCHAR(15) NOT NULL,
    status        VARCHAR(20) NOT NULL CONSTRAINT DF_seats_status DEFAULT 'ACTIVE',

    CONSTRAINT PK_seats PRIMARY KEY (seat_id),
    CONSTRAINT FK_seats_room FOREIGN KEY (room_id)
        REFERENCES dbo.rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT FK_seats_type FOREIGN KEY (seat_type_id)
        REFERENCES dbo.seat_types(seat_type_id),
    CONSTRAINT UQ_seats_room_position UNIQUE (room_id, seat_row, seat_number),
    CONSTRAINT UQ_seats_room_label UNIQUE (room_id, seat_label),
    CONSTRAINT CK_seats_number CHECK (seat_number > 0),
    CONSTRAINT CK_seats_status CHECK (status IN ('ACTIVE', 'BROKEN', 'INACTIVE'))
);
GO

/* ============================================================================
   5. SUẤT CHIẾU VÀ GHẾ THEO SUẤT
   ============================================================================ */

CREATE TABLE dbo.showtimes (
    showtime_id    INT IDENTITY(1,1) NOT NULL,
    movie_id       INT NOT NULL,
    room_id        INT NOT NULL,
    start_time     DATETIME2(0) NOT NULL,
    end_time       DATETIME2(0) NOT NULL,
    base_price     DECIMAL(12,2) NOT NULL,
    status         VARCHAR(20) NOT NULL CONSTRAINT DF_showtimes_status DEFAULT 'OPEN',
    created_by     INT NULL,
    created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_showtimes_created_at DEFAULT SYSDATETIME(),
    updated_at     DATETIME2(0) NOT NULL CONSTRAINT DF_showtimes_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_showtimes PRIMARY KEY (showtime_id),
    CONSTRAINT FK_showtimes_movie FOREIGN KEY (movie_id)
        REFERENCES dbo.movies(movie_id),
    CONSTRAINT FK_showtimes_room FOREIGN KEY (room_id)
        REFERENCES dbo.rooms(room_id),
    CONSTRAINT FK_showtimes_created_by FOREIGN KEY (created_by)
        REFERENCES dbo.users(user_id),
    CONSTRAINT CK_showtimes_time CHECK (end_time > start_time),
    CONSTRAINT CK_showtimes_price CHECK (base_price >= 0),
    CONSTRAINT CK_showtimes_status CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);
GO

CREATE INDEX IX_showtimes_movie_start
ON dbo.showtimes(movie_id, start_time);
GO

CREATE INDEX IX_showtimes_room_time
ON dbo.showtimes(room_id, start_time, end_time);
GO

/* ============================================================================
   showtime_seats
   FIX V6.3: Thêm cột computed seat_status để NestJS entity (@Column name: 'seat_status') hoạt động.
   Cột status (VARCHAR 20) vẫn là cột gốc nghiệp vụ. seat_status là alias computed, PERSISTED.
   ============================================================================ */
CREATE TABLE dbo.showtime_seats (
    showtime_seat_id   INT IDENTITY(1,1) NOT NULL,
    showtime_id        INT NOT NULL,
    seat_id            INT NOT NULL,
    price              DECIMAL(12,2) NOT NULL,
    status             VARCHAR(20) NOT NULL CONSTRAINT DF_showtime_seats_status DEFAULT 'AVAILABLE',
    held_by_user_id    INT NULL,
    hold_expires_at    DATETIME2(0) NULL,
    row_version        ROWVERSION,

    CONSTRAINT PK_showtime_seats PRIMARY KEY (showtime_seat_id),
    CONSTRAINT FK_showtime_seats_showtime FOREIGN KEY (showtime_id)
        REFERENCES dbo.showtimes(showtime_id) ON DELETE CASCADE,
    CONSTRAINT FK_showtime_seats_seat FOREIGN KEY (seat_id)
        REFERENCES dbo.seats(seat_id),
    CONSTRAINT FK_showtime_seats_held_user FOREIGN KEY (held_by_user_id)
        REFERENCES dbo.users(user_id),
    CONSTRAINT UQ_showtime_seats_showtime_seat UNIQUE (showtime_id, seat_id),
    CONSTRAINT CK_showtime_seats_price CHECK (price >= 0),
    CONSTRAINT CK_showtime_seats_status CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')),
    CONSTRAINT CK_showtime_seats_hold_data CHECK (
        (status = 'HELD' AND held_by_user_id IS NOT NULL AND hold_expires_at IS NOT NULL)
        OR
        (status <> 'HELD')
    )
);
GO

/* Thêm cột computed seat_status = alias của status cho NestJS entity tương thích */
ALTER TABLE dbo.showtime_seats
ADD seat_status AS CAST(status AS VARCHAR(20)) PERSISTED;
GO

CREATE INDEX IX_showtime_seats_showtime_status
ON dbo.showtime_seats(showtime_id, status);
GO

CREATE INDEX IX_showtime_seats_hold_expiry
ON dbo.showtime_seats(status, hold_expires_at)
WHERE status = 'HELD';
GO

/* ============================================================================
   6. GIỮ GHẾ
   ============================================================================ */

CREATE TABLE dbo.seat_holds (
    hold_id            BIGINT IDENTITY(1,1) NOT NULL,
    user_id            INT NOT NULL,
    showtime_seat_id   INT NOT NULL,
    hold_token         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_seat_holds_token DEFAULT NEWID(),
    status             VARCHAR(20) NOT NULL CONSTRAINT DF_seat_holds_status DEFAULT 'ACTIVE',
    expires_at         DATETIME2(0) NOT NULL,
    created_at         DATETIME2(0) NOT NULL CONSTRAINT DF_seat_holds_created_at DEFAULT SYSDATETIME(),
    released_at        DATETIME2(0) NULL,

    CONSTRAINT PK_seat_holds PRIMARY KEY (hold_id),
    CONSTRAINT FK_seat_holds_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id),
    CONSTRAINT FK_seat_holds_showtime_seat FOREIGN KEY (showtime_seat_id)
        REFERENCES dbo.showtime_seats(showtime_seat_id),
    CONSTRAINT UQ_seat_holds_token UNIQUE (hold_token),
    CONSTRAINT CK_seat_holds_status CHECK (status IN ('ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED'))
);
GO

CREATE UNIQUE INDEX UX_seat_holds_active_seat
ON dbo.seat_holds(showtime_seat_id)
WHERE status = 'ACTIVE';
GO

CREATE INDEX IX_seat_holds_expiry
ON dbo.seat_holds(status, expires_at);
GO

/* ============================================================================
   7. ĐƠN ĐẶT VÉ VÀ CHI TIẾT
   FIX V6.3: Thêm cột computed booking_status = alias của status cho NestJS entity tương thích.
   ============================================================================ */

CREATE TABLE dbo.booking_orders (
    booking_id           BIGINT IDENTITY(1,1) NOT NULL,
    booking_code         VARCHAR(40) NOT NULL,
    user_id              INT NOT NULL,
    showtime_id          INT NOT NULL,
    promotion_id         INT NULL,
    subtotal_amount      DECIMAL(12,2) NOT NULL CONSTRAINT DF_booking_subtotal DEFAULT 0,
    discount_amount      DECIMAL(12,2) NOT NULL CONSTRAINT DF_booking_discount DEFAULT 0,
    product_amount       DECIMAL(12,2) NOT NULL CONSTRAINT DF_booking_product DEFAULT 0,
    total_amount         DECIMAL(12,2) NOT NULL,
    status               VARCHAR(30) NOT NULL CONSTRAINT DF_booking_status DEFAULT 'PENDING_PAYMENT',
    idempotency_key      VARCHAR(100) NULL,
    expires_at           DATETIME2(0) NULL,
    paid_at              DATETIME2(0) NULL,
    issued_at            DATETIME2(0) NULL,
    cancelled_at         DATETIME2(0) NULL,
    created_at           DATETIME2(0) NOT NULL CONSTRAINT DF_booking_created_at DEFAULT SYSDATETIME(),
    updated_at           DATETIME2(0) NOT NULL CONSTRAINT DF_booking_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_booking_orders PRIMARY KEY (booking_id),
    CONSTRAINT FK_booking_orders_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id),
    CONSTRAINT FK_booking_orders_showtime FOREIGN KEY (showtime_id)
        REFERENCES dbo.showtimes(showtime_id),
    CONSTRAINT UQ_booking_orders_code UNIQUE (booking_code),
    CONSTRAINT CK_booking_amounts CHECK (
        subtotal_amount >= 0 AND discount_amount >= 0 AND product_amount >= 0
        AND total_amount >= 0
        AND discount_amount <= subtotal_amount + product_amount
    ),
    CONSTRAINT CK_booking_status CHECK (
        status IN ('PENDING_PAYMENT', 'PAID', 'ISSUED', 'CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED')
    )
);
GO

/* Thêm cột computed booking_status = alias của status cho NestJS entity tương thích */
ALTER TABLE dbo.booking_orders
ADD booking_status AS CAST(status AS VARCHAR(30)) PERSISTED;
GO

CREATE UNIQUE INDEX UX_booking_orders_idempotency
ON dbo.booking_orders(idempotency_key)
WHERE idempotency_key IS NOT NULL;
GO

CREATE INDEX IX_booking_orders_user_created
ON dbo.booking_orders(user_id, created_at DESC);
GO

CREATE INDEX IX_booking_orders_status_expiry
ON dbo.booking_orders(status, expires_at);
GO

CREATE TABLE dbo.booking_details (
    booking_detail_id   BIGINT IDENTITY(1,1) NOT NULL,
    booking_id          BIGINT NOT NULL,
    showtime_seat_id    INT NOT NULL,
    seat_price          DECIMAL(12,2) NOT NULL,
    status              VARCHAR(20) NOT NULL CONSTRAINT DF_booking_details_status DEFAULT 'ACTIVE',
    created_at          DATETIME2(0) NOT NULL CONSTRAINT DF_booking_details_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_booking_details PRIMARY KEY (booking_detail_id),
    CONSTRAINT FK_booking_details_booking FOREIGN KEY (booking_id)
        REFERENCES dbo.booking_orders(booking_id) ON DELETE CASCADE,
    CONSTRAINT FK_booking_details_showtime_seat FOREIGN KEY (showtime_seat_id)
        REFERENCES dbo.showtime_seats(showtime_seat_id),
    CONSTRAINT UQ_booking_details_booking_seat UNIQUE (booking_id, showtime_seat_id),
    CONSTRAINT CK_booking_details_price CHECK (seat_price >= 0),
    CONSTRAINT CK_booking_details_status CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED'))
);
GO

/* Chỉ một booking detail ACTIVE được giữ một ghế tại một thời điểm */
CREATE UNIQUE INDEX UX_booking_details_active_seat
ON dbo.booking_details(showtime_seat_id)
WHERE status = 'ACTIVE';
GO

/* ============================================================================
   8. SẢN PHẨM / COMBO
   ============================================================================ */

CREATE TABLE dbo.products (
    product_id     INT IDENTITY(1,1) NOT NULL,
    product_name   NVARCHAR(150) NOT NULL,
    description    NVARCHAR(500) NULL,
    image_url      NVARCHAR(500) NULL,
    price          DECIMAL(12,2) NOT NULL,
    stock_quantity INT NULL,
    status         VARCHAR(20) NOT NULL CONSTRAINT DF_products_status DEFAULT 'ACTIVE',
    created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_products_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_products PRIMARY KEY (product_id),
    CONSTRAINT CK_products_price CHECK (price >= 0),
    CONSTRAINT CK_products_stock CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
    CONSTRAINT CK_products_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'))
);
GO

CREATE TABLE dbo.booking_products (
    booking_product_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id         BIGINT NOT NULL,
    product_id         INT NOT NULL,
    quantity           INT NOT NULL,
    unit_price         DECIMAL(12,2) NOT NULL,
    total_price        AS (CONVERT(DECIMAL(12,2), quantity * unit_price)) PERSISTED,

    CONSTRAINT PK_booking_products PRIMARY KEY (booking_product_id),
    CONSTRAINT FK_booking_products_booking FOREIGN KEY (booking_id)
        REFERENCES dbo.booking_orders(booking_id) ON DELETE CASCADE,
    CONSTRAINT FK_booking_products_product FOREIGN KEY (product_id)
        REFERENCES dbo.products(product_id),
    CONSTRAINT UQ_booking_products_booking_product UNIQUE (booking_id, product_id),
    CONSTRAINT CK_booking_products_quantity CHECK (quantity > 0),
    CONSTRAINT CK_booking_products_price CHECK (unit_price >= 0)
);
GO


/* Combo bắp nước chuyên biệt; products vẫn dùng cho hàng hóa/add-on chung */
CREATE TABLE dbo.concession_combos (
    combo_id       INT IDENTITY(1,1) NOT NULL,
    combo_name     NVARCHAR(150) NOT NULL,
    description    NVARCHAR(500) NULL,
    image_url      NVARCHAR(500) NULL,
    price          DECIMAL(12,2) NOT NULL,
    status         VARCHAR(20) NOT NULL CONSTRAINT DF_concession_combos_status DEFAULT 'ACTIVE',
    created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_concession_combos_created_at DEFAULT SYSDATETIME(),
    updated_at     DATETIME2(0) NOT NULL CONSTRAINT DF_concession_combos_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_concession_combos PRIMARY KEY (combo_id),
    CONSTRAINT CK_concession_combos_price CHECK (price >= 0),
    CONSTRAINT CK_concession_combos_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'))
);
GO

CREATE TABLE dbo.booking_combos (
    booking_combo_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id       BIGINT NOT NULL,
    combo_id         INT NOT NULL,
    quantity         INT NOT NULL,
    unit_price       DECIMAL(12,2) NOT NULL,
    total_price      AS (CONVERT(DECIMAL(12,2), quantity * unit_price)) PERSISTED,

    CONSTRAINT PK_booking_combos PRIMARY KEY (booking_combo_id),
    CONSTRAINT FK_booking_combos_booking FOREIGN KEY (booking_id)
        REFERENCES dbo.booking_orders(booking_id) ON DELETE CASCADE,
    CONSTRAINT FK_booking_combos_combo FOREIGN KEY (combo_id)
        REFERENCES dbo.concession_combos(combo_id),
    CONSTRAINT UQ_booking_combos_booking_combo UNIQUE (booking_id, combo_id),
    CONSTRAINT CK_booking_combos_quantity CHECK (quantity > 0),
    CONSTRAINT CK_booking_combos_price CHECK (unit_price >= 0)
);
GO

CREATE INDEX IX_booking_combos_booking ON dbo.booking_combos(booking_id);
GO

/* ============================================================================
   9. KHUYẾN MÃI
   FIX V6.3: Thêm cột computed voucher_status = alias của status cho NestJS entity tương thích.
             Giữ promotion_code VARCHAR(50) như SQL gốc; entity nên đổi length: 50.
   ============================================================================ */

CREATE TABLE dbo.promotions (
    promotion_id       INT IDENTITY(1,1) NOT NULL,
    promotion_code     VARCHAR(50) NOT NULL,
    promotion_name     NVARCHAR(150) NOT NULL,
    description        NVARCHAR(500) NULL,
    discount_type      VARCHAR(20) NOT NULL,
    discount_value     DECIMAL(12,2) NOT NULL,
    max_discount       DECIMAL(12,2) NULL,
    min_order_amount   DECIMAL(12,2) NOT NULL CONSTRAINT DF_promotions_min_order DEFAULT 0,
    usage_limit        INT NULL,
    used_count         INT NOT NULL CONSTRAINT DF_promotions_used_count DEFAULT 0,
    start_at           DATETIME2(0) NOT NULL,
    end_at             DATETIME2(0) NOT NULL,
    status             VARCHAR(20) NOT NULL CONSTRAINT DF_promotions_status DEFAULT 'ACTIVE',
    created_at         DATETIME2(0) NOT NULL CONSTRAINT DF_promotions_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_promotions PRIMARY KEY (promotion_id),
    CONSTRAINT UQ_promotions_code UNIQUE (promotion_code),
    CONSTRAINT CK_promotions_type CHECK (discount_type IN ('PERCENT', 'FIXED')),
    CONSTRAINT CK_promotions_value CHECK (discount_value > 0),
    CONSTRAINT CK_promotions_percent CHECK (discount_type <> 'PERCENT' OR discount_value <= 100),
    CONSTRAINT CK_promotions_amounts CHECK (
        min_order_amount >= 0 AND (max_discount IS NULL OR max_discount >= 0)
    ),
    CONSTRAINT CK_promotions_usage CHECK (
        used_count >= 0 AND (usage_limit IS NULL OR usage_limit >= 0)
    ),
    CONSTRAINT CK_promotions_time CHECK (end_at > start_at),
    CONSTRAINT CK_promotions_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED'))
);
GO

/* Thêm cột computed voucher_status = alias của status cho NestJS entity tương thích */
ALTER TABLE dbo.promotions
ADD voucher_status AS CAST(status AS VARCHAR(20)) PERSISTED;
GO

ALTER TABLE dbo.booking_orders
ADD CONSTRAINT FK_booking_orders_promotion
FOREIGN KEY (promotion_id) REFERENCES dbo.promotions(promotion_id);
GO

/* ============================================================================
   10. THANH TOÁN
   FIX V6.3: CK_payments_method bổ sung ZALOPAY, CREDIT_CARD (Frontend dùng).
             Giữ payment_status dùng tên cột đúng như entity backend.
   ============================================================================ */

CREATE TABLE dbo.payments (
    payment_id          BIGINT IDENTITY(1,1) NOT NULL,
    booking_id          BIGINT NOT NULL,
    payment_method      VARCHAR(30) NOT NULL,
    provider            VARCHAR(30) NULL,
    amount              DECIMAL(12,2) NOT NULL,
    transaction_code    VARCHAR(150) NULL,
    request_id          VARCHAR(100) NULL,
    payment_status      VARCHAR(20) NOT NULL CONSTRAINT DF_payments_status DEFAULT 'PENDING',
    provider_response   NVARCHAR(MAX) NULL,
    failed_reason       NVARCHAR(500) NULL,
    paid_at             DATETIME2(0) NULL,
    created_at          DATETIME2(0) NOT NULL CONSTRAINT DF_payments_created_at DEFAULT SYSDATETIME(),
    updated_at          DATETIME2(0) NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_payments PRIMARY KEY (payment_id),
    CONSTRAINT FK_payments_booking FOREIGN KEY (booking_id)
        REFERENCES dbo.booking_orders(booking_id),
    /* FIX: bổ sung ZALOPAY, CREDIT_CARD vào CHECK constraint */
    CONSTRAINT CK_payments_method CHECK (
        payment_method IN ('MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK', 'ZALOPAY', 'CREDIT_CARD')
    ),
    CONSTRAINT CK_payments_amount CHECK (amount >= 0),
    CONSTRAINT CK_payments_status CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    CONSTRAINT CK_payments_failed_reason CHECK (payment_status = 'FAILED' OR failed_reason IS NULL)
);
GO

CREATE UNIQUE INDEX UX_payments_transaction_code
ON dbo.payments(transaction_code)
WHERE transaction_code IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_payments_request_id
ON dbo.payments(request_id)
WHERE request_id IS NOT NULL;
GO

CREATE INDEX IX_payments_booking_status
ON dbo.payments(booking_id, payment_status);
GO

/* Hoàn tiền được lưu riêng để báo cáo doanh thu thuần chính xác */
CREATE TABLE dbo.refunds (
    refund_id          BIGINT IDENTITY(1,1) NOT NULL,
    payment_id         BIGINT NOT NULL,
    booking_id         BIGINT NOT NULL,
    refund_amount      DECIMAL(12,2) NOT NULL,
    reason             NVARCHAR(500) NULL,
    provider_ref       VARCHAR(150) NULL,
    refund_status      VARCHAR(20) NOT NULL CONSTRAINT DF_refunds_status DEFAULT 'PENDING',
    requested_at       DATETIME2(0) NOT NULL CONSTRAINT DF_refunds_requested_at DEFAULT SYSDATETIME(),
    completed_at       DATETIME2(0) NULL,

    CONSTRAINT PK_refunds PRIMARY KEY (refund_id),
    CONSTRAINT FK_refunds_payment FOREIGN KEY (payment_id) REFERENCES dbo.payments(payment_id),
    CONSTRAINT FK_refunds_booking FOREIGN KEY (booking_id) REFERENCES dbo.booking_orders(booking_id),
    CONSTRAINT CK_refunds_amount CHECK (refund_amount > 0),
    CONSTRAINT CK_refunds_status CHECK (refund_status IN ('PENDING', 'SUCCESS', 'FAILED')),
    CONSTRAINT CK_refunds_completed CHECK (
        (refund_status = 'SUCCESS' AND completed_at IS NOT NULL) OR refund_status <> 'SUCCESS'
    )
);
GO

CREATE INDEX IX_refunds_booking_status
ON dbo.refunds(booking_id, refund_status);
GO

/* ============================================================================
   11. VÉ ĐIỆN TỬ
   ============================================================================ */

CREATE TABLE dbo.tickets (
    ticket_id           BIGINT IDENTITY(1,1) NOT NULL,
    booking_detail_id   BIGINT NOT NULL,
    ticket_code         VARCHAR(60) NOT NULL,
    qr_code             VARCHAR(500) NOT NULL,
    ticket_status       VARCHAR(20) NOT NULL CONSTRAINT DF_tickets_status DEFAULT 'VALID',
    issued_at           DATETIME2(0) NOT NULL CONSTRAINT DF_tickets_issued_at DEFAULT SYSDATETIME(),
    checked_in_at       DATETIME2(0) NULL,
    checked_in_by       INT NULL,

    CONSTRAINT PK_tickets PRIMARY KEY (ticket_id),
    CONSTRAINT FK_tickets_booking_detail FOREIGN KEY (booking_detail_id)
        REFERENCES dbo.booking_details(booking_detail_id),
    CONSTRAINT FK_tickets_checked_in_by FOREIGN KEY (checked_in_by)
        REFERENCES dbo.users(user_id),
    CONSTRAINT UQ_tickets_booking_detail UNIQUE (booking_detail_id),
    CONSTRAINT UQ_tickets_ticket_code UNIQUE (ticket_code),
    CONSTRAINT CK_tickets_status CHECK (ticket_status IN ('VALID', 'USED', 'CANCELLED', 'EXPIRED'))
);
GO

/* ============================================================================
   12. OTP
   ============================================================================ */

CREATE TABLE dbo.otp_codes (
    otp_id       BIGINT IDENTITY(1,1) NOT NULL,
    user_id      INT NOT NULL,
    code         VARCHAR(10) NOT NULL,
    purpose      VARCHAR(30) NOT NULL,
    expires_at   DATETIME2(0) NOT NULL,
    is_used      BIT NOT NULL CONSTRAINT DF_otp_codes_is_used DEFAULT 0,
    attempts     INT NOT NULL CONSTRAINT DF_otp_codes_attempts DEFAULT 0,
    created_at   DATETIME2(0) NOT NULL CONSTRAINT DF_otp_codes_created_at DEFAULT SYSDATETIME(),
    used_at      DATETIME2(0) NULL,

    CONSTRAINT PK_otp_codes PRIMARY KEY (otp_id),
    CONSTRAINT FK_otp_codes_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT CK_otp_codes_purpose CHECK (
        purpose IN ('VERIFY_EMAIL', 'FORGOT_PASSWORD', 'RESET_PASSWORD', 'LOGIN')
    ),
    CONSTRAINT CK_otp_codes_attempts CHECK (attempts >= 0)
);
GO

CREATE INDEX IX_otp_codes_lookup
ON dbo.otp_codes(user_id, purpose, is_used, expires_at DESC);
GO

/* ============================================================================
   13. THÔNG BÁO VÀ SĂN VÉ
   ============================================================================ */

CREATE TABLE dbo.notifications (
    notification_id    BIGINT IDENTITY(1,1) NOT NULL,
    user_id            INT NOT NULL,
    title              NVARCHAR(200) NOT NULL,
    message            NVARCHAR(MAX) NOT NULL,
    notification_type  VARCHAR(30) NOT NULL,
    reference_type     VARCHAR(30) NULL,
    reference_id       VARCHAR(80) NULL,
    is_read            BIT NOT NULL CONSTRAINT DF_notifications_is_read DEFAULT 0,
    read_at            DATETIME2(0) NULL,
    created_at         DATETIME2(0) NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_notifications PRIMARY KEY (notification_id),
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT CK_notifications_type CHECK (
        notification_type IN ('BOOKING', 'PAYMENT', 'TICKET', 'TICKET_WATCH', 'PROMOTION', 'SYSTEM')
    )
);
GO

CREATE INDEX IX_notifications_user_read
ON dbo.notifications(user_id, is_read, created_at DESC);
GO

CREATE TABLE dbo.ticket_watch_requests (
    watch_id              BIGINT IDENTITY(1,1) NOT NULL,
    user_id               INT NOT NULL,
    movie_id              INT NOT NULL,
    cinema_id             INT NULL,
    preferred_date        DATE NULL,
    preferred_time_from   TIME(0) NULL,
    preferred_time_to     TIME(0) NULL,
    preferred_seat_type   VARCHAR(30) NULL,
    seat_preference       VARCHAR(20) NULL,
    wants_combo           BIT NOT NULL CONSTRAINT DF_watch_wants_combo DEFAULT 0,
    min_seats             INT NOT NULL CONSTRAINT DF_watch_min_seats DEFAULT 1,
    max_price             DECIMAL(12,2) NULL,
    status                VARCHAR(20) NOT NULL CONSTRAINT DF_watch_status DEFAULT 'ACTIVE',
    matched_showtime_id   INT NULL,
    created_at            DATETIME2(0) NOT NULL CONSTRAINT DF_watch_created_at DEFAULT SYSDATETIME(),
    expires_at            DATETIME2(0) NULL,
    matched_at            DATETIME2(0) NULL,

    CONSTRAINT PK_ticket_watch_requests PRIMARY KEY (watch_id),
    CONSTRAINT FK_watch_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_watch_movie FOREIGN KEY (movie_id)
        REFERENCES dbo.movies(movie_id),
    CONSTRAINT FK_watch_cinema FOREIGN KEY (cinema_id)
        REFERENCES dbo.cinemas(cinema_id),
    CONSTRAINT FK_watch_showtime FOREIGN KEY (matched_showtime_id)
        REFERENCES dbo.showtimes(showtime_id),
    CONSTRAINT CK_watch_seat_type CHECK (
        preferred_seat_type IS NULL OR preferred_seat_type IN ('NORMAL', 'VIP', 'COUPLE')
    ),
    CONSTRAINT CK_watch_seat_preference CHECK (seat_preference IS NULL OR seat_preference IN ('front', 'middle', 'back', 'any')),
    CONSTRAINT CK_watch_min_seats CHECK (min_seats BETWEEN 1 AND 8),
    CONSTRAINT CK_watch_max_price CHECK (max_price IS NULL OR max_price >= 0),
    CONSTRAINT CK_watch_status CHECK (status IN ('ACTIVE', 'MATCHED', 'CANCELLED', 'EXPIRED')),
    CONSTRAINT CK_watch_time_range CHECK (
        preferred_time_from IS NULL OR preferred_time_to IS NULL
        OR preferred_time_to > preferred_time_from
    )
);
GO

CREATE INDEX IX_ticket_watch_active
ON dbo.ticket_watch_requests(status, movie_id, cinema_id, preferred_date);
GO

/* ============================================================================
   14. AUDIT LOG
   ============================================================================ */

CREATE TABLE dbo.audit_logs (
    audit_id       BIGINT IDENTITY(1,1) NOT NULL,
    user_id        INT NULL,
    action         VARCHAR(80) NOT NULL,
    entity_type    VARCHAR(80) NOT NULL,
    entity_id      VARCHAR(80) NULL,
    old_values     NVARCHAR(MAX) NULL,
    new_values     NVARCHAR(MAX) NULL,
    ip_address     VARCHAR(45) NULL,
    user_agent     NVARCHAR(500) NULL,
    created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT SYSDATETIME(),

    CONSTRAINT PK_audit_logs PRIMARY KEY (audit_id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id)
        REFERENCES dbo.users(user_id),
    CONSTRAINT CK_audit_logs_old_values_json CHECK (old_values IS NULL OR ISJSON(old_values) = 1),
    CONSTRAINT CK_audit_logs_new_values_json CHECK (new_values IS NULL OR ISJSON(new_values) = 1)
);
GO

CREATE INDEX IX_audit_logs_entity
ON dbo.audit_logs(entity_type, entity_id, created_at DESC);
GO

CREATE INDEX IX_audit_logs_user
ON dbo.audit_logs(user_id, created_at DESC);
GO

/* ============================================================================
   15. TRIGGER CẬP NHẬT updated_at
   ============================================================================ */

CREATE TRIGGER dbo.trg_users_updated_at
ON dbo.users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE u
    SET updated_at = SYSDATETIME()
    FROM dbo.users u
    INNER JOIN inserted i ON i.user_id = u.user_id;
END;
GO

CREATE TRIGGER dbo.trg_movies_updated_at
ON dbo.movies
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE m
    SET updated_at = SYSDATETIME()
    FROM dbo.movies m
    INNER JOIN inserted i ON i.movie_id = m.movie_id;
END;
GO

CREATE TRIGGER dbo.trg_showtimes_updated_at
ON dbo.showtimes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE s
    SET updated_at = SYSDATETIME()
    FROM dbo.showtimes s
    INNER JOIN inserted i ON i.showtime_id = s.showtime_id;
END;
GO

CREATE TRIGGER dbo.trg_booking_orders_updated_at
ON dbo.booking_orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE b
    SET updated_at = SYSDATETIME()
    FROM dbo.booking_orders b
    INNER JOIN inserted i ON i.booking_id = b.booking_id;
END;
GO

CREATE TRIGGER dbo.trg_payments_updated_at
ON dbo.payments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE p
    SET updated_at = SYSDATETIME()
    FROM dbo.payments p
    INNER JOIN inserted i ON i.payment_id = p.payment_id;
END;
GO

/* Chặn suất chiếu trùng phòng */
CREATE TRIGGER dbo.trg_showtimes_prevent_overlap
ON dbo.showtimes
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted ins
        JOIN dbo.showtimes s ON s.room_id = ins.room_id
            AND s.showtime_id <> ins.showtime_id
            AND s.status <> 'CANCELLED'
            AND ins.status <> 'CANCELLED'
            AND s.start_time < ins.end_time
            AND s.end_time > ins.start_time
    )
    BEGIN
        THROW 50010, N'Suất chiếu bị trùng lịch trong cùng phòng.', 1;
    END;
END;
GO

/* Đồng bộ users.role → user_roles sau khi cập nhật role */
CREATE TRIGGER dbo.trg_users_sync_role
ON dbo.users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(role) RETURN;

    DECLARE @user_id INT, @role_code VARCHAR(20), @role_id INT;

    DECLARE role_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT user_id, role FROM inserted;

    OPEN role_cursor;
    FETCH NEXT FROM role_cursor INTO @user_id, @role_code;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @role_id = role_id FROM dbo.roles WHERE role_code = @role_code;

        IF @role_id IS NOT NULL
        BEGIN
            DELETE FROM dbo.user_roles
            WHERE user_id = @user_id AND role_id <> @role_id;

            IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = @user_id AND role_id = @role_id)
                INSERT INTO dbo.user_roles(user_id, role_id) VALUES(@user_id, @role_id);
        END;

        FETCH NEXT FROM role_cursor INTO @user_id, @role_code;
    END;

    CLOSE role_cursor;
    DEALLOCATE role_cursor;
END;
GO

/* ============================================================================
   16. STORED PROCEDURES
   ============================================================================ */

CREATE OR ALTER PROCEDURE dbo.sp_generate_showtime_seats
    @showtime_id INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @room_id INT;
    DECLARE @base_price DECIMAL(12,2);

    SELECT @room_id = room_id, @base_price = base_price
    FROM dbo.showtimes
    WHERE showtime_id = @showtime_id;

    IF @room_id IS NULL
        THROW 50003, N'Không tìm thấy suất chiếu.', 1;

    INSERT INTO dbo.showtime_seats (showtime_id, seat_id, price)
    SELECT
        @showtime_id,
        s.seat_id,
        CONVERT(DECIMAL(12,2), @base_price * st.price_multiplier)
    FROM dbo.seats s
    JOIN dbo.seat_types st ON st.seat_type_id = s.seat_type_id
    WHERE s.room_id = @room_id
      AND s.status = 'ACTIVE'
      AND st.status = 'ACTIVE'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.showtime_seats ss
          WHERE ss.showtime_id = @showtime_id AND ss.seat_id = s.seat_id
      );
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_create_showtime
    @movie_id   INT,
    @room_id    INT,
    @start_time DATETIME2(0),
    @base_price DECIMAL(12,2),
    @created_by INT = NULL,
    @showtime_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @duration INT;
    SELECT @duration = duration_minutes FROM dbo.movies WHERE movie_id = @movie_id;

    IF @duration IS NULL
        THROW 50004, N'Không tìm thấy phim.', 1;

    DECLARE @end_time DATETIME2(0) = DATEADD(MINUTE, @duration, @start_time);

    BEGIN TRANSACTION;

    INSERT INTO dbo.showtimes(movie_id, room_id, start_time, end_time, base_price, created_by)
    VALUES (@movie_id, @room_id, @start_time, @end_time, @base_price, @created_by);

    SET @showtime_id = SCOPE_IDENTITY();

    EXEC dbo.sp_generate_showtime_seats @showtime_id;

    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_find_ticket_suggestions
    @user_id    INT,
    @movie_id   INT = NULL,
    @city       NVARCHAR(100) = NULL,
    @date_from  DATE = NULL,
    @date_to    DATE = NULL,
    @max_price  DECIMAL(12,2) = NULL,
    @min_seats  INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.showtime_id,
        m.title           AS movie_title,
        m.poster_url,
        c.cinema_name,
        c.city,
        r.room_name,
        r.room_type,
        s.start_time,
        s.end_time,
        s.base_price,
        COUNT(ss.showtime_seat_id) AS available_seats
    FROM dbo.showtimes s
    JOIN dbo.movies m ON m.movie_id = s.movie_id
    JOIN dbo.rooms r ON r.room_id = s.room_id
    JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    JOIN dbo.showtime_seats ss ON ss.showtime_id = s.showtime_id AND ss.status = 'AVAILABLE'
    WHERE s.status = 'OPEN'
      AND s.start_time > SYSDATETIME()
      AND (@movie_id IS NULL OR s.movie_id = @movie_id)
      AND (@city IS NULL OR c.city = @city)
      AND (@date_from IS NULL OR CAST(s.start_time AS DATE) >= @date_from)
      AND (@date_to IS NULL OR CAST(s.start_time AS DATE) <= @date_to)
      AND (@max_price IS NULL OR s.base_price <= @max_price)
    GROUP BY
        s.showtime_id, m.title, m.poster_url,
        c.cinema_name, c.city, r.room_name, r.room_type,
        s.start_time, s.end_time, s.base_price
    HAVING COUNT(ss.showtime_seat_id) >= @min_seats
    ORDER BY available_seats DESC, s.start_time ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_hold_seats
    @user_id             INT,
    @showtime_seat_ids   NVARCHAR(MAX),   -- JSON array: [1,2,3]
    @hold_minutes        INT = 10,
    @hold_token          UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @hold_token = NEWID();
    DECLARE @expires_at DATETIME2(0) = DATEADD(MINUTE, @hold_minutes, SYSDATETIME());

    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM OPENJSON(@showtime_seat_ids) WITH (id INT '$') j
        JOIN dbo.showtime_seats ss ON ss.showtime_seat_id = j.id
        WHERE ss.status <> 'AVAILABLE'
    )
    BEGIN
        ROLLBACK;
        THROW 50005, N'Một hoặc nhiều ghế không còn khả dụng.', 1;
    END;

    UPDATE ss
    SET status          = 'HELD',
        held_by_user_id = @user_id,
        hold_expires_at = @expires_at
    FROM dbo.showtime_seats ss
    JOIN OPENJSON(@showtime_seat_ids) WITH (id INT '$') j ON j.id = ss.showtime_seat_id
    WHERE ss.status = 'AVAILABLE';

    INSERT INTO dbo.seat_holds (user_id, showtime_seat_id, hold_token, expires_at)
    SELECT @user_id, j.id, @hold_token, @expires_at
    FROM OPENJSON(@showtime_seat_ids) WITH (id INT '$') j;

    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_release_expired_holds
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    UPDATE ss
    SET status          = 'AVAILABLE',
        held_by_user_id = NULL,
        hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    WHERE ss.status = 'HELD'
      AND ss.hold_expires_at <= SYSDATETIME();

    UPDATE dbo.seat_holds
    SET status      = 'EXPIRED',
        released_at = SYSDATETIME()
    WHERE status    = 'ACTIVE'
      AND expires_at <= SYSDATETIME();

    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_create_booking
    @user_id           INT,
    @showtime_id       INT,
    @showtime_seat_ids NVARCHAR(MAX),   -- JSON array
    @promotion_id      INT = NULL,
    @idempotency_key   VARCHAR(100) = NULL,
    @booking_id        BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* Idempotency check */
    IF @idempotency_key IS NOT NULL
    BEGIN
        SELECT @booking_id = booking_id
        FROM dbo.booking_orders
        WHERE idempotency_key = @idempotency_key;

        IF @booking_id IS NOT NULL RETURN;
    END;

    BEGIN TRANSACTION;

    /* Kiểm tra ghế còn HELD bởi user này */
    IF EXISTS (
        SELECT 1
        FROM OPENJSON(@showtime_seat_ids) WITH (id INT '$') j
        JOIN dbo.showtime_seats ss ON ss.showtime_seat_id = j.id
        WHERE ss.status <> 'HELD'
           OR ss.held_by_user_id <> @user_id
           OR ss.hold_expires_at <= SYSDATETIME()
    )
    BEGIN
        ROLLBACK;
        THROW 50006, N'Một hoặc nhiều ghế đã hết hạn giữ hoặc không thuộc về bạn.', 1;
    END;

    /* Tính tiền */
    DECLARE @subtotal DECIMAL(12,2);
    SELECT @subtotal = SUM(ss.price)
    FROM dbo.showtime_seats ss
    JOIN OPENJSON(@showtime_seat_ids) WITH (id INT '$') j ON j.id = ss.showtime_seat_id;

    DECLARE @discount DECIMAL(12,2) = 0;
    IF @promotion_id IS NOT NULL
    BEGIN
        DECLARE @dtype VARCHAR(20), @dval DECIMAL(12,2), @maxd DECIMAL(12,2), @minorder DECIMAL(12,2);
        SELECT @dtype = discount_type, @dval = discount_value,
               @maxd = max_discount, @minorder = min_order_amount
        FROM dbo.promotions
        WHERE promotion_id = @promotion_id
          AND status = 'ACTIVE'
          AND SYSDATETIME() BETWEEN start_at AND end_at
          AND (usage_limit IS NULL OR used_count < usage_limit);

        IF @dtype IS NOT NULL AND @subtotal >= @minorder
        BEGIN
            SET @discount = CASE @dtype
                WHEN 'PERCENT' THEN @subtotal * @dval / 100
                WHEN 'FIXED'   THEN @dval
                ELSE 0
            END;
            IF @maxd IS NOT NULL AND @discount > @maxd SET @discount = @maxd;
            IF @discount > @subtotal SET @discount = @subtotal;

            UPDATE dbo.promotions SET used_count = used_count + 1 WHERE promotion_id = @promotion_id;
        END;
    END;

    DECLARE @total DECIMAL(12,2) = @subtotal - @discount;
    DECLARE @booking_code VARCHAR(40) = 'BK' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') + RIGHT(CONVERT(VARCHAR(36), NEWID()), 6);
    DECLARE @expires_at DATETIME2(0) = DATEADD(MINUTE, 15, SYSDATETIME());

    INSERT INTO dbo.booking_orders
        (booking_code, user_id, showtime_id, promotion_id, subtotal_amount, discount_amount,
         total_amount, idempotency_key, expires_at)
    VALUES
        (@booking_code, @user_id, @showtime_id, @promotion_id, @subtotal, @discount,
         @total, @idempotency_key, @expires_at);

    SET @booking_id = SCOPE_IDENTITY();

    INSERT INTO dbo.booking_details (booking_id, showtime_seat_id, seat_price)
    SELECT @booking_id, j.id, ss.price
    FROM OPENJSON(@showtime_seat_ids) WITH (id INT '$') j
    JOIN dbo.showtime_seats ss ON ss.showtime_seat_id = j.id;

    UPDATE ss
    SET status          = 'SOLD',
        held_by_user_id = NULL,
        hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    JOIN OPENJSON(@showtime_seat_ids) WITH (id INT '$') j ON j.id = ss.showtime_seat_id;

    UPDATE dbo.seat_holds
    SET status      = 'CONFIRMED',
        released_at = SYSDATETIME()
    WHERE user_id = @user_id
      AND showtime_seat_id IN (
          SELECT value FROM OPENJSON(@showtime_seat_ids)
      )
      AND status = 'ACTIVE';

    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_confirm_payment
    @booking_id      BIGINT,
    @payment_method  VARCHAR(30),
    @transaction_code VARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @current_status VARCHAR(30);
    SELECT @current_status = status FROM dbo.booking_orders WHERE booking_id = @booking_id;

    IF @current_status <> 'PENDING_PAYMENT'
    BEGIN
        ROLLBACK;
        THROW 50007, N'Đơn đặt không ở trạng thái chờ thanh toán.', 1;
    END;

    UPDATE dbo.booking_orders
    SET status   = 'PAID',
        paid_at  = SYSDATETIME()
    WHERE booking_id = @booking_id;

    INSERT INTO dbo.payments
        (booking_id, payment_method, amount, transaction_code, payment_status, paid_at)
    SELECT
        booking_id, @payment_method, total_amount, @transaction_code, 'SUCCESS', SYSDATETIME()
    FROM dbo.booking_orders
    WHERE booking_id = @booking_id;

    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_checkin_ticket
    @ticket_code  VARCHAR(60),
    @staff_id     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @ticket_id BIGINT, @ticket_status VARCHAR(20), @showtime_start DATETIME2(0);

    SELECT
        @ticket_id     = t.ticket_id,
        @ticket_status = t.ticket_status,
        @showtime_start = sh.start_time
    FROM dbo.tickets t
    JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
    JOIN dbo.booking_orders bo ON bo.booking_id = bd.booking_id
    JOIN dbo.showtimes sh ON sh.showtime_id = bo.showtime_id
    WHERE t.ticket_code = @ticket_code;

    IF @ticket_id IS NULL
    BEGIN
        ROLLBACK;
        THROW 50008, N'Không tìm thấy vé.', 1;
    END;

    IF @ticket_status <> 'VALID'
    BEGIN
        ROLLBACK;
        THROW 50009, N'Vé không hợp lệ để check-in.', 1;
    END;

    UPDATE dbo.tickets
    SET ticket_status  = 'USED',
        checked_in_at  = SYSDATETIME(),
        checked_in_by  = @staff_id
    WHERE ticket_id = @ticket_id;

    COMMIT TRANSACTION;
END;
GO

/* ============================================================================
   17. VIEWS
   ============================================================================ */

CREATE VIEW dbo.vw_showtime_seat_map AS
SELECT
    ss.showtime_seat_id,
    ss.showtime_id,
    ss.seat_id,
    s.seat_row,
    s.seat_number,
    s.seat_label,
    st.type_code   AS seat_type_code,
    st.type_name   AS seat_type_name,
    ss.price,
    ss.status,
    ss.seat_status,
    ss.held_by_user_id,
    ss.hold_expires_at
FROM dbo.showtime_seats ss
JOIN dbo.seats s ON s.seat_id = ss.seat_id
JOIN dbo.seat_types st ON st.seat_type_id = s.seat_type_id;
GO

CREATE VIEW dbo.vw_booking_summary AS
SELECT
    bo.booking_id,
    bo.booking_code,
    bo.user_id,
    u.full_name,
    u.email,
    m.title   AS movie_title,
    c.cinema_name,
    sh.start_time,
    bo.total_amount,
    bo.status,
    bo.booking_status,
    bo.created_at
FROM dbo.booking_orders bo
JOIN dbo.users u ON u.user_id = bo.user_id
JOIN dbo.showtimes sh ON sh.showtime_id = bo.showtime_id
JOIN dbo.movies m ON m.movie_id = sh.movie_id
JOIN dbo.rooms r ON r.room_id = sh.room_id
JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id;
GO

CREATE VIEW dbo.vw_daily_revenue AS
SELECT
    CAST(p.paid_at AS DATE)   AS revenue_date,
    c.cinema_id,
    c.cinema_name,
    COUNT(DISTINCT bo.booking_id)   AS total_bookings,
    SUM(bo.total_amount)            AS gross_revenue,
    ISNULL(SUM(r.refund_amount), 0) AS refunded_amount,
    SUM(bo.total_amount) - ISNULL(SUM(r.refund_amount), 0) AS net_revenue
FROM dbo.payments p
JOIN dbo.booking_orders bo ON bo.booking_id = p.booking_id
JOIN dbo.showtimes sh ON sh.showtime_id = bo.showtime_id
JOIN dbo.rooms rm ON rm.room_id = sh.room_id
JOIN dbo.cinemas c ON c.cinema_id = rm.cinema_id
LEFT JOIN dbo.refunds r ON r.booking_id = bo.booking_id AND r.refund_status = 'SUCCESS'
WHERE p.payment_status = 'SUCCESS'
GROUP BY CAST(p.paid_at AS DATE), c.cinema_id, c.cinema_name;
GO

/* ============================================================================
   18. SEED DATA CƠ BẢN
   ============================================================================ */

INSERT INTO dbo.roles(role_code, role_name, description)
VALUES
    ('CUSTOMER', N'Khách hàng',    N'Người dùng thông thường, đặt vé và xem phim'),
    ('STAFF',    N'Nhân viên',     N'Nhân viên rạp, quản lý suất chiếu và check-in'),
    ('ADMIN',    N'Quản trị viên', N'Toàn quyền quản trị hệ thống');
GO

INSERT INTO dbo.seat_types(type_code, type_name, price_multiplier)
VALUES
    ('NORMAL', N'Ghế thường',  1.00),
    ('VIP',    N'Ghế VIP',     1.50),
    ('COUPLE', N'Ghế đôi',     1.80);
GO

INSERT INTO dbo.genres(genre_name, slug)
VALUES
    (N'Hành động',    'action'),
    (N'Kinh dị',      'horror'),
    (N'Hài',          'comedy'),
    (N'Tình cảm',     'romance'),
    (N'Khoa học viễn tưởng', 'sci-fi'),
    (N'Hoạt hình',    'animation'),
    (N'Tâm lý',       'drama'),
    (N'Phiêu lưu',    'adventure'),
    (N'Gia đình',     'family'),
    (N'Tội phạm',     'crime');
GO

INSERT INTO dbo.users(full_name, email, phone, password_hash, role)
VALUES
    (N'Admin CineHunt',  'admin@cinehunt.vn',   '0900000001',
     '$2b$10$placeholder_admin_hash',   'ADMIN'),
    (N'Nhân viên 01',    'staff01@cinehunt.vn', '0900000002',
     '$2b$10$placeholder_staff_hash',   'STAFF'),
    (N'Nguyễn Văn An',   'an.nguyen@gmail.com', '0912345678',
     '$2b$10$placeholder_customer_hash','CUSTOMER'),
    (N'Trần Thị Bình',   'binh.tran@gmail.com', '0987654321',
     '$2b$10$placeholder_customer2',   'CUSTOMER'),
    (N'Lê Minh Cường',   'cuong.le@gmail.com',  '0978123456',
     '$2b$10$placeholder_customer3',   'CUSTOMER');
GO

/* Đồng bộ user_roles cho tất cả user vừa tạo */
DECLARE @uid INT;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT user_id FROM dbo.users;
OPEN c; FETCH NEXT FROM c INTO @uid;
WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC dbo.sp_sync_user_role @uid;
    FETCH NEXT FROM c INTO @uid;
END;
CLOSE c; DEALLOCATE c;
GO

INSERT INTO dbo.cinemas(cinema_name, address, city, district, phone)
VALUES
    (N'CineHunt Vincom Bà Triệu', N'191 Bà Triệu, Hai Bà Trưng', N'Hà Nội', N'Hai Bà Trưng', '024 3974 3333'),
    (N'CineHunt Mipec Long Biên',  N'02 Long Biên, Long Biên',    N'Hà Nội', N'Long Biên',    '024 3827 2727'),
    (N'CineHunt Landmark 81',      N'720A Điện Biên Phủ, Bình Thạnh', N'TP. Hồ Chí Minh', N'Bình Thạnh', '028 7300 8081');
GO

INSERT INTO dbo.rooms(cinema_id, room_name, room_type, total_seats)
VALUES
    (1, N'Phòng 1 - Standard', 'STANDARD', 80),
    (1, N'Phòng 2 - VIP',      'VIP',      60),
    (1, N'Phòng 3 - IMAX',     'IMAX',    120),
    (2, N'Phòng 1 - Standard', 'STANDARD', 80),
    (2, N'Phòng 2 - VIP',      'VIP',      60),
    (3, N'Phòng 1 - Standard', 'STANDARD', 80),
    (3, N'Phòng 2 - 4DX',      '4DX',      50);
GO

/* Tạo ghế mẫu cho room 1 (8 hàng x 10 cột) */
DECLARE @room_id INT = 1;
DECLARE @rows TABLE (r VARCHAR(1));
INSERT INTO @rows VALUES('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H');

DECLARE @row_char VARCHAR(1), @col INT, @type_id INT;

DECLARE row_cur CURSOR LOCAL FAST_FORWARD FOR SELECT r FROM @rows;
OPEN row_cur; FETCH NEXT FROM row_cur INTO @row_char;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @col = 1;
    WHILE @col <= 10
    BEGIN
        SET @type_id = CASE
            WHEN @row_char IN ('A','B') THEN (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'VIP')
            WHEN @row_char = 'H' AND @col IN (5,6) THEN (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'COUPLE')
            ELSE (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'NORMAL')
        END;

        INSERT INTO dbo.seats(room_id, seat_type_id, seat_row, seat_number, seat_label)
        VALUES (@room_id, @type_id, @row_char, @col, @row_char + CAST(@col AS VARCHAR(3)));

        SET @col = @col + 1;
    END;
    FETCH NEXT FROM row_cur INTO @row_char;
END;
CLOSE row_cur; DEALLOCATE row_cur;
GO

INSERT INTO dbo.movies(title, original_title, description, duration_minutes, release_date, age_rating, director, actors, country, language, status)
VALUES
    (N'Avengers: Secret Wars',
     'Avengers: Secret Wars',
     N'Các siêu anh hùng Marvel đối đầu mối đe dọa đa vũ trụ lớn nhất từ trước đến nay.',
     150, '2026-05-01', 'T13',
     N'Russo Brothers',
     N'Robert Downey Jr., Chris Evans, Scarlett Johansson',
     N'Mỹ', N'Tiếng Anh', 'NOW_SHOWING'),

    (N'Ma Búp Bê 5',
     'Annabelle 5',
     N'Búp bê quỷ ám trở lại với màn ám ảnh kinh hoàng hơn bao giờ hết.',
     105, '2026-06-13', 'T18',
     N'James Wan',
     N'Vera Farmiga, Patrick Wilson',
     N'Mỹ', N'Tiếng Anh', 'NOW_SHOWING'),

    (N'Doraemon: Nobita và Hành tinh Thú Cưng',
     'Doraemon the Movie 2026',
     N'Nobita tìm thấy hành tinh bí ẩn nơi mọi thú cưng đều có thể nói chuyện.',
     95, '2026-03-05', 'P',
     N'Takashi Yamazaki',
     N'Wasabi Mizuta, Megumi Ohara',
     N'Nhật Bản', N'Tiếng Việt (lồng tiếng)', 'NOW_SHOWING'),

    (N'Lật Mặt 8: Vé Số',
     'Lat Mat 8',
     N'Hành trình hài hước và cảm động xoay quanh tờ vé số trúng độc đắc.',
     120, '2026-04-30', 'T13',
     N'Lý Hải',
     N'Lý Hải, Minh Hà, Trấn Thành',
     N'Việt Nam', N'Tiếng Việt', 'NOW_SHOWING'),

    (N'Kẻ Trộm Mặt Trăng 5',
     'Despicable Me 5',
     N'Gru và những Minion trở lại trong cuộc phiêu lưu mới cực kỳ hài hước.',
     90, '2026-07-04', 'P',
     N'Chris Renaud',
     N'Steve Carell (lồng tiếng)',
     N'Mỹ', N'Tiếng Việt (lồng tiếng)', 'COMING_SOON');
GO

INSERT INTO dbo.movie_genres(movie_id, genre_id)
SELECT m.movie_id, g.genre_id
FROM (VALUES
    (N'Avengers: Secret Wars',          N'Hành động'),
    (N'Avengers: Secret Wars',          N'Phiêu lưu'),
    (N'Ma Búp Bê 5',                    N'Kinh dị'),
    (N'Doraemon: Nobita và Hành tinh Thú Cưng', N'Hoạt hình'),
    (N'Doraemon: Nobita và Hành tinh Thú Cưng', N'Gia đình'),
    (N'Lật Mặt 8: Vé Số',              N'Hài'),
    (N'Lật Mặt 8: Vé Số',              N'Tình cảm'),
    (N'Kẻ Trộm Mặt Trăng 5',           N'Hoạt hình'),
    (N'Kẻ Trộm Mặt Trăng 5',           N'Gia đình')
) AS src(movie_title, genre_name)
JOIN dbo.movies m ON m.title = src.movie_title
JOIN dbo.genres g ON g.genre_name = src.genre_name;
GO

INSERT INTO dbo.promotions(promotion_code, promotion_name, description, discount_type, discount_value, max_discount, min_order_amount, usage_limit, start_at, end_at)
VALUES
    ('CINEHUNT10',  N'Giảm 10% toàn bộ đơn hàng', N'Áp dụng cho tất cả phim đang chiếu', 'PERCENT', 10, 50000, 100000, 200, '2026-01-01', '2026-12-31'),
    ('WELCOME50K',  N'Tặng 50.000đ cho đơn đầu',  N'Chỉ áp dụng lần đầu đặt vé',         'FIXED',   50000, NULL,  150000, 500, '2026-01-01', '2026-12-31'),
    ('SUMMER2026',  N'Ưu đãi hè 2026 giảm 15%',   N'Áp dụng tháng 6-8/2026',             'PERCENT', 15, 75000, 120000, 300, '2026-06-01', '2026-08-31');
GO

/* Tạo suất chiếu mẫu cho các phim đang chiếu */
DECLARE @sid INT;

EXEC dbo.sp_create_showtime
    @movie_id = 1, @room_id = 1,
    @start_time = '2026-07-08 09:00:00',
    @base_price = 90000, @created_by = 1,
    @showtime_id = @sid OUTPUT;

EXEC dbo.sp_create_showtime
    @movie_id = 1, @room_id = 2,
    @start_time = '2026-07-08 14:00:00',
    @base_price = 120000, @created_by = 1,
    @showtime_id = @sid OUTPUT;

EXEC dbo.sp_create_showtime
    @movie_id = 2, @room_id = 1,
    @start_time = '2026-07-08 11:30:00',
    @base_price = 85000, @created_by = 1,
    @showtime_id = @sid OUTPUT;

EXEC dbo.sp_create_showtime
    @movie_id = 3, @room_id = 1,
    @start_time = '2026-07-09 10:00:00',
    @base_price = 75000, @created_by = 1,
    @showtime_id = @sid OUTPUT;

EXEC dbo.sp_create_showtime
    @movie_id = 4, @room_id = 4,
    @start_time = '2026-07-08 13:00:00',
    @base_price = 80000, @created_by = 1,
    @showtime_id = @sid OUTPUT;
GO

/* ============================================================================
   19. KIỂM TRA CUỐI
   ============================================================================ */

SELECT
    t.name AS table_name,
    p.rows AS row_count
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
ORDER BY t.name;
GO

SELECT
    s.name AS schema_name,
    o.name AS object_name,
    o.type_desc
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type IN ('TR','P','V')
ORDER BY o.type_desc, o.name;
GO

PRINT N'============================================================';
PRINT N'CineHunt Database V6.3 khởi tạo thành công!';
PRINT N'Các fix V6.3:';
PRINT N'  [OK] payments: ZALOPAY, CREDIT_CARD đã thêm vào CHECK constraint';
PRINT N'  [OK] booking_orders: cột computed booking_status thêm cho entity NestJS';
PRINT N'  [OK] showtime_seats: cột computed seat_status thêm cho entity NestJS';
PRINT N'  [OK] promotions: cột computed voucher_status thêm cho entity NestJS';
PRINT N'============================================================';
GO
