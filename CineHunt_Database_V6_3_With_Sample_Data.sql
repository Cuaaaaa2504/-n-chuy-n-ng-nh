/* ============================================================================
   CINEHUNT DATABASE V6
   Hệ thống săn vé / đặt vé xem phim
   DBMS: Microsoft SQL Server
   Backend: NestJS + TypeORM
   Version: 6.2 (backend/frontend compatible)
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

/* Đồng bộ role đơn của backend vào bảng RBAC mở rộng.
   Backend hiện đọc/ghi users.role; procedure này dùng khi cần đồng bộ thủ công hoặc từ service. */
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
   Lưu ý V6: KHÔNG unique toàn cục showtime_seat_id.
   Chỉ chặn ghế nằm trong booking đang còn hiệu lực bằng filtered index.
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

ALTER TABLE dbo.booking_orders
ADD CONSTRAINT FK_booking_orders_promotion
FOREIGN KEY (promotion_id) REFERENCES dbo.promotions(promotion_id);
GO

/* ============================================================================
   10. THANH TOÁN
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
    CONSTRAINT CK_payments_method CHECK (payment_method IN ('MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK')),
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

/* ============================================================================
   16. CHỐNG TRÙNG LỊCH PHÒNG
   ============================================================================ */

CREATE TRIGGER dbo.trg_showtimes_updated_at
ON dbo.showtimes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;

    UPDATE st
    SET updated_at = SYSDATETIME()
    FROM dbo.showtimes st
    INNER JOIN inserted i ON i.showtime_id = st.showtime_id;
END;
GO

CREATE TRIGGER dbo.trg_booking_orders_updated_at
ON dbo.booking_orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;

    UPDATE bo
    SET updated_at = SYSDATETIME()
    FROM dbo.booking_orders bo
    INNER JOIN inserted i ON i.booking_id = bo.booking_id;
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

CREATE TRIGGER dbo.trg_showtimes_prevent_overlap
ON dbo.showtimes
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.showtimes s
            ON s.room_id = i.room_id
           AND s.showtime_id <> i.showtime_id
           AND s.status <> 'CANCELLED'
           AND i.status <> 'CANCELLED'
           AND i.start_time < s.end_time
           AND i.end_time > s.start_time
    )
    BEGIN
        THROW 51001, N'Phòng chiếu bị trùng lịch trong khoảng thời gian đã chọn.', 1;
    END;
END;
GO

/* ============================================================================
   17. PROCEDURE TẠO SUẤT CHIẾU AN TOÀN
   Tự tính giờ kết thúc = thời lượng phim + thời gian vệ sinh, kiểm tra trùng lịch,
   sau đó sinh ghế cho suất chiếu trong cùng transaction.
   ============================================================================ */
CREATE PROCEDURE dbo.sp_create_showtime
    @movie_id INT,
    @room_id INT,
    @start_time DATETIME2(0),
    @base_price DECIMAL(12,2),
    @created_by INT = NULL,
    @cleaning_minutes INT = 15
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @base_price < 0
        THROW 51015, N'Giá vé cơ bản không được âm.', 1;
    IF @cleaning_minutes NOT BETWEEN 0 AND 120
        THROW 51016, N'Thời gian vệ sinh phải từ 0 đến 120 phút.', 1;

    DECLARE @duration_minutes INT;
    SELECT @duration_minutes = duration_minutes
    FROM dbo.movies
    WHERE movie_id = @movie_id AND status <> 'HIDDEN';

    IF @duration_minutes IS NULL
        THROW 51017, N'Phim không tồn tại hoặc đang bị ẩn.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.rooms WHERE room_id = @room_id AND status = 'ACTIVE')
        THROW 51018, N'Phòng chiếu không tồn tại hoặc không hoạt động.', 1;

    DECLARE @end_time DATETIME2(0) = DATEADD(MINUTE, @duration_minutes + @cleaning_minutes, @start_time);
    DECLARE @showtime_id INT;

    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM dbo.showtimes WITH (UPDLOCK, HOLDLOCK)
        WHERE room_id = @room_id
          AND status <> 'CANCELLED'
          AND @start_time < end_time
          AND @end_time > start_time
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51019, N'Phòng chiếu bị trùng lịch.', 1;
    END;

    INSERT INTO dbo.showtimes(movie_id, room_id, start_time, end_time, base_price, status, created_by)
    VALUES(@movie_id, @room_id, @start_time, @end_time, @base_price, 'OPEN', @created_by);

    SET @showtime_id = SCOPE_IDENTITY();
    EXEC dbo.sp_generate_showtime_seats @showtime_id = @showtime_id;

    INSERT INTO dbo.audit_logs(user_id, action, entity_type, entity_id, new_values)
    VALUES(
        @created_by,
        'CREATE_SHOWTIME',
        'showtimes',
        CONVERT(VARCHAR(80), @showtime_id),
        (SELECT @movie_id AS movie_id, @room_id AS room_id, @start_time AS start_time,
                @end_time AS end_time, @base_price AS base_price FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    );

    COMMIT TRANSACTION;

    SELECT * FROM dbo.showtimes WHERE showtime_id = @showtime_id;
END;
GO

/* ============================================================================
   17. PROCEDURE SINH GHẾ CHO SUẤT CHIẾU
   ============================================================================ */

CREATE PROCEDURE dbo.sp_generate_showtime_seats
    @showtime_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @room_id INT;
    DECLARE @base_price DECIMAL(12,2);

    SELECT
        @room_id = room_id,
        @base_price = base_price
    FROM dbo.showtimes
    WHERE showtime_id = @showtime_id;

    IF @room_id IS NULL
        THROW 51002, N'Suất chiếu không tồn tại.', 1;

    INSERT INTO dbo.showtime_seats(showtime_id, seat_id, price, status)
    SELECT
        @showtime_id,
        s.seat_id,
        ROUND(@base_price * st.price_multiplier, 0),
        CASE WHEN s.status = 'ACTIVE' THEN 'AVAILABLE' ELSE 'BLOCKED' END
    FROM dbo.seats s
    INNER JOIN dbo.seat_types st ON st.seat_type_id = s.seat_type_id
    WHERE s.room_id = @room_id
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.showtime_seats ss
          WHERE ss.showtime_id = @showtime_id
            AND ss.seat_id = s.seat_id
      );
END;
GO

/* ============================================================================
   18. PROCEDURE GIỮ NHIỀU GHẾ
   @seat_ids nhận JSON array, ví dụ: [1,2,3]
   ============================================================================ */

CREATE PROCEDURE dbo.sp_hold_seats
    @user_id INT,
    @showtime_id INT,
    @seat_ids NVARCHAR(MAX),
    @hold_minutes INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @hold_minutes NOT BETWEEN 1 AND 30
        THROW 51003, N'Thời gian giữ ghế phải từ 1 đến 30 phút.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.users
        WHERE user_id = @user_id AND status = 'ACTIVE'
    )
        THROW 51004, N'Người dùng không tồn tại hoặc không hoạt động.', 1;

    DECLARE @RequestedSeats TABLE (
        showtime_seat_id INT PRIMARY KEY
    );

    INSERT INTO @RequestedSeats(showtime_seat_id)
    SELECT DISTINCT TRY_CONVERT(INT, [value])
    FROM OPENJSON(@seat_ids)
    WHERE TRY_CONVERT(INT, [value]) IS NOT NULL;

    DECLARE @SeatCount INT = (SELECT COUNT(*) FROM @RequestedSeats);

    IF @SeatCount = 0
        THROW 51005, N'Danh sách ghế không hợp lệ.', 1;

    IF @SeatCount > 8
        THROW 51006, N'Mỗi đơn chỉ được chọn tối đa 8 ghế.', 1;

    BEGIN TRANSACTION;

    /* Giải phóng hold quá hạn trước khi giữ */
    UPDATE ss WITH (UPDLOCK, HOLDLOCK)
    SET status = 'AVAILABLE',
        held_by_user_id = NULL,
        hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    WHERE ss.showtime_id = @showtime_id
      AND ss.status = 'HELD'
      AND ss.hold_expires_at <= SYSDATETIME();

    UPDATE sh
    SET status = 'EXPIRED',
        released_at = SYSDATETIME()
    FROM dbo.seat_holds sh
    INNER JOIN dbo.showtime_seats ss
        ON ss.showtime_seat_id = sh.showtime_seat_id
    WHERE ss.showtime_id = @showtime_id
      AND sh.status = 'ACTIVE'
      AND sh.expires_at <= SYSDATETIME();

    IF (
        SELECT COUNT(*)
        FROM dbo.showtime_seats ss WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN @RequestedSeats r
            ON r.showtime_seat_id = ss.showtime_seat_id
        WHERE ss.showtime_id = @showtime_id
          AND ss.status = 'AVAILABLE'
    ) <> @SeatCount
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51007, N'Một hoặc nhiều ghế không còn trống.', 1;
    END;

    DECLARE @ExpiresAt DATETIME2(0) = DATEADD(MINUTE, @hold_minutes, SYSDATETIME());
    DECLARE @HoldToken UNIQUEIDENTIFIER = NEWID();

    UPDATE ss
    SET status = 'HELD',
        held_by_user_id = @user_id,
        hold_expires_at = @ExpiresAt
    FROM dbo.showtime_seats ss
    INNER JOIN @RequestedSeats r
        ON r.showtime_seat_id = ss.showtime_seat_id;

    INSERT INTO dbo.seat_holds(
        user_id, showtime_seat_id, hold_token, status, expires_at
    )
    SELECT
        @user_id, r.showtime_seat_id, @HoldToken, 'ACTIVE', @ExpiresAt
    FROM @RequestedSeats r;

    COMMIT TRANSACTION;

    SELECT
        @HoldToken AS hold_token,
        @ExpiresAt AS expires_at,
        ss.showtime_seat_id,
        s.seat_label,
        ss.price,
        ss.status
    FROM dbo.showtime_seats ss
    INNER JOIN dbo.seats s ON s.seat_id = ss.seat_id
    INNER JOIN @RequestedSeats r ON r.showtime_seat_id = ss.showtime_seat_id
    ORDER BY s.seat_row, s.seat_number;
END;
GO

/* ============================================================================
   19. PROCEDURE GIẢI PHÓNG HOLD HẾT HẠN
   ============================================================================ */

CREATE PROCEDURE dbo.sp_release_expired_holds
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

    COMMIT TRANSACTION;
END;
GO

/* ============================================================================
   20. PROCEDURE TẠO BOOKING TỪ HOLD TOKEN
   ============================================================================ */

CREATE PROCEDURE dbo.sp_create_booking
    @user_id INT,
    @showtime_id INT,
    @hold_token UNIQUEIDENTIFIER,
    @idempotency_key VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @idempotency_key IS NOT NULL
       AND EXISTS (SELECT 1 FROM dbo.booking_orders WHERE idempotency_key = @idempotency_key)
    BEGIN
        SELECT *
        FROM dbo.booking_orders
        WHERE idempotency_key = @idempotency_key;
        RETURN;
    END;

    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.showtimes WITH (UPDLOCK, HOLDLOCK)
        WHERE showtime_id = @showtime_id
          AND status = 'OPEN'
          AND start_time > DATEADD(MINUTE, 15, SYSDATETIME())
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51024, N'Suất chiếu đã đóng hoặc đã quá thời hạn đặt vé trực tuyến.', 1;
    END;

    DECLARE @Seats TABLE (
        showtime_seat_id INT PRIMARY KEY,
        price DECIMAL(12,2)
    );

    INSERT INTO @Seats(showtime_seat_id, price)
    SELECT ss.showtime_seat_id, ss.price
    FROM dbo.seat_holds sh WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN dbo.showtime_seats ss WITH (UPDLOCK, HOLDLOCK)
        ON ss.showtime_seat_id = sh.showtime_seat_id
    WHERE sh.user_id = @user_id
      AND sh.hold_token = @hold_token
      AND sh.status = 'ACTIVE'
      AND sh.expires_at > SYSDATETIME()
      AND ss.showtime_id = @showtime_id
      AND ss.status = 'HELD'
      AND ss.held_by_user_id = @user_id;

    DECLARE @SeatCount INT = (SELECT COUNT(*) FROM @Seats);

    IF @SeatCount = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51008, N'Hold token không hợp lệ hoặc đã hết hạn.', 1;
    END;

    IF @SeatCount > 8
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51023, N'Mỗi đơn chỉ được đặt tối đa 8 ghế.', 1;
    END;

    DECLARE @Subtotal DECIMAL(12,2) = (SELECT SUM(price) FROM @Seats);
    DECLARE @BookingId BIGINT;
    DECLARE @BookingCode VARCHAR(40) =
        CONCAT('CH', FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss'), RIGHT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8));

    INSERT INTO dbo.booking_orders(
        booking_code, user_id, showtime_id,
        subtotal_amount, discount_amount, product_amount, total_amount,
        status, idempotency_key, expires_at
    )
    VALUES(
        @BookingCode, @user_id, @showtime_id,
        @Subtotal, 0, 0, @Subtotal,
        'PENDING_PAYMENT', @idempotency_key,
        DATEADD(MINUTE, 10, SYSDATETIME())
    );

    SET @BookingId = SCOPE_IDENTITY();

    INSERT INTO dbo.booking_details(
        booking_id, showtime_seat_id, seat_price, status
    )
    SELECT @BookingId, showtime_seat_id, price, 'ACTIVE'
    FROM @Seats;

    COMMIT TRANSACTION;

    SELECT *
    FROM dbo.booking_orders
    WHERE booking_id = @BookingId;
END;
GO
/* ============================================================================
   21. PROCEDURE XÁC NHẬN THANH TOÁN
   Idempotent theo request_id / transaction_code.
   ============================================================================ */

CREATE PROCEDURE dbo.sp_confirm_payment
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

    UPDATE ss
    SET ss.status = 'SOLD',
        ss.held_by_user_id = NULL,
        ss.hold_expires_at = NULL
    FROM dbo.showtime_seats ss
    INNER JOIN dbo.booking_details bd
        ON bd.showtime_seat_id = ss.showtime_seat_id
    WHERE bd.booking_id = @booking_id
      AND bd.status = 'ACTIVE'
      AND ss.status = 'HELD';

    UPDATE sh
    SET sh.status = 'CONFIRMED',
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

    INSERT INTO dbo.notifications(
        user_id, title, message, notification_type, reference_type, reference_id
    )
    SELECT
        bo.user_id,
        N'Thanh toán thành công',
        CONCAT(N'Đơn ', bo.booking_code, N' đã thanh toán và phát hành vé.'),
        'PAYMENT',
        'BOOKING',
        CONVERT(VARCHAR(80), bo.booking_id)
    FROM dbo.booking_orders bo
    WHERE bo.booking_id = @booking_id;

    COMMIT TRANSACTION;

    SELECT
        t.ticket_id,
        t.ticket_code,
        t.qr_code,
        t.ticket_status,
        t.issued_at,
        bd.showtime_seat_id
    FROM dbo.tickets t
    INNER JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
    WHERE bd.booking_id = @booking_id;
END;
GO
/* ============================================================================
   22. PROCEDURE CHECK-IN VÉ
   ============================================================================ */

CREATE PROCEDURE dbo.sp_checkin_ticket
    @ticket_code VARCHAR(60),
    @staff_user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @TicketId BIGINT;
    DECLARE @Status VARCHAR(20);
    DECLARE @StartTime DATETIME2(0);

    SELECT
        @TicketId = t.ticket_id,
        @Status = t.ticket_status,
        @StartTime = st.start_time
    FROM dbo.tickets t WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN dbo.booking_details bd ON bd.booking_detail_id = t.booking_detail_id
    INNER JOIN dbo.showtime_seats ss ON ss.showtime_seat_id = bd.showtime_seat_id
    INNER JOIN dbo.showtimes st ON st.showtime_id = ss.showtime_id
    WHERE t.ticket_code = @ticket_code;

    IF @TicketId IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51012, N'Không tìm thấy vé.', 1;
    END;

    IF @Status <> 'VALID'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51013, N'Vé không hợp lệ hoặc đã được sử dụng.', 1;
    END;

    IF SYSDATETIME() NOT BETWEEN DATEADD(MINUTE, -30, @StartTime) AND DATEADD(MINUTE, 30, @StartTime)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51014, N'Vé chỉ được quét trong khoảng 30 phút trước hoặc sau giờ chiếu.', 1;
    END;

    UPDATE dbo.tickets
    SET ticket_status = 'USED',
        checked_in_at = SYSDATETIME(),
        checked_in_by = @staff_user_id
    WHERE ticket_id = @TicketId;

    COMMIT TRANSACTION;

    SELECT * FROM dbo.tickets WHERE ticket_id = @TicketId;
END;
GO

/* ============================================================================
   23. PROCEDURE GỢI Ý SUẤT CHIẾU CHO YÊU CẦU SĂN VÉ
   Trả về suất chiếu còn đủ ghế, phù hợp ngày/giờ/ngân sách và ưu tiên vị trí ghế.
   ============================================================================ */
CREATE PROCEDURE dbo.sp_find_ticket_suggestions
    @watch_id BIGINT,
    @top_n INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @top_n NOT BETWEEN 1 AND 100 SET @top_n = 20;

    DECLARE
        @movie_id INT,
        @cinema_id INT,
        @preferred_date DATE,
        @time_from TIME(0),
        @time_to TIME(0),
        @preferred_seat_type VARCHAR(30),
        @seat_preference VARCHAR(20),
        @min_seats INT,
        @max_price DECIMAL(12,2),
        @wants_combo BIT;

    SELECT
        @movie_id = movie_id,
        @cinema_id = cinema_id,
        @preferred_date = preferred_date,
        @time_from = preferred_time_from,
        @time_to = preferred_time_to,
        @preferred_seat_type = preferred_seat_type,
        @seat_preference = seat_preference,
        @min_seats = min_seats,
        @max_price = max_price,
        @wants_combo = wants_combo
    FROM dbo.ticket_watch_requests
    WHERE watch_id = @watch_id AND status = 'ACTIVE';

    IF @movie_id IS NULL
        THROW 51020, N'Yêu cầu săn vé không tồn tại hoặc không còn hoạt động.', 1;

    ;WITH Candidate AS (
        SELECT
            st.showtime_id,
            st.start_time,
            st.end_time,
            st.base_price,
            m.title AS movie_title,
            c.cinema_id,
            c.cinema_name,
            r.room_id,
            r.room_name,
            COUNT(CASE WHEN ss.status = 'AVAILABLE' THEN 1 END) AS available_seats,
            MIN(CASE WHEN ss.status = 'AVAILABLE' THEN ss.price END) AS min_available_price,
            COUNT(CASE WHEN ss.status = 'AVAILABLE'
                        AND (@preferred_seat_type IS NULL OR seat_type.type_code = @preferred_seat_type)
                       THEN 1 END) AS preferred_type_available,
            COUNT(CASE WHEN ss.status = 'AVAILABLE' AND (
                        @seat_preference IS NULL OR @seat_preference = 'any'
                        OR (@seat_preference = 'front' AND s.seat_row IN ('A','B','C'))
                        OR (@seat_preference = 'middle' AND s.seat_row IN ('D','E','F','G'))
                        OR (@seat_preference = 'back' AND s.seat_row NOT IN ('A','B','C','D','E','F','G'))
                       ) THEN 1 END) AS preferred_position_available
        FROM dbo.showtimes st
        INNER JOIN dbo.movies m ON m.movie_id = st.movie_id
        INNER JOIN dbo.rooms r ON r.room_id = st.room_id
        INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
        INNER JOIN dbo.showtime_seats ss ON ss.showtime_id = st.showtime_id
        INNER JOIN dbo.seats s ON s.seat_id = ss.seat_id
        INNER JOIN dbo.seat_types seat_type ON seat_type.seat_type_id = s.seat_type_id
        WHERE st.movie_id = @movie_id
          AND st.status = 'OPEN'
          AND st.start_time > SYSDATETIME()
          AND (@cinema_id IS NULL OR c.cinema_id = @cinema_id)
          AND (@preferred_date IS NULL OR CAST(st.start_time AS DATE) = @preferred_date)
          AND (@time_from IS NULL OR CAST(st.start_time AS TIME) >= @time_from)
          AND (@time_to IS NULL OR CAST(st.start_time AS TIME) <= @time_to)
        GROUP BY st.showtime_id, st.start_time, st.end_time, st.base_price,
                 m.title, c.cinema_id, c.cinema_name, r.room_id, r.room_name
    )
    SELECT TOP (@top_n)
        *,
        @wants_combo AS wants_combo,
        CASE WHEN @wants_combo = 1 AND EXISTS (
            SELECT 1 FROM dbo.concession_combos cc WHERE cc.status = 'ACTIVE'
        ) THEN 1 ELSE 0 END AS combo_available,
        (preferred_type_available * 2 + preferred_position_available) AS match_score
    FROM Candidate
    WHERE available_seats >= @min_seats
      AND (@preferred_seat_type IS NULL OR preferred_type_available >= @min_seats)
      AND (@seat_preference IS NULL OR @seat_preference = 'any' OR preferred_position_available >= @min_seats)
      AND (@max_price IS NULL OR min_available_price <= @max_price)
    ORDER BY match_score DESC, min_available_price ASC, start_time ASC;
END;
GO

/* ============================================================================
   23. VIEW
   ============================================================================ */

CREATE VIEW dbo.vw_showtime_seat_map
AS
SELECT
    ss.showtime_seat_id,
    st.showtime_id,
    m.movie_id,
    m.title AS movie_title,
    c.cinema_id,
    c.cinema_name,
    r.room_id,
    r.room_name,
    s.seat_id,
    s.seat_label,
    s.seat_row,
    s.seat_number,
    seat_type.type_code AS seat_type,
    ss.price,
    ss.status AS seat_status,
    ss.held_by_user_id,
    ss.hold_expires_at,
    st.start_time,
    st.end_time
FROM dbo.showtime_seats ss
INNER JOIN dbo.showtimes st ON st.showtime_id = ss.showtime_id
INNER JOIN dbo.movies m ON m.movie_id = st.movie_id
INNER JOIN dbo.rooms r ON r.room_id = st.room_id
INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
INNER JOIN dbo.seats s ON s.seat_id = ss.seat_id
INNER JOIN dbo.seat_types seat_type ON seat_type.seat_type_id = s.seat_type_id;
GO

CREATE VIEW dbo.vw_booking_summary
AS
SELECT
    bo.booking_id,
    bo.booking_code,
    bo.user_id,
    u.full_name,
    u.email,
    bo.showtime_id,
    m.title AS movie_title,
    c.cinema_name,
    r.room_name,
    st.start_time,
    bo.subtotal_amount,
    bo.discount_amount,
    bo.product_amount,
    bo.total_amount,
    bo.status AS booking_status,
    bo.expires_at,
    bo.paid_at,
    bo.created_at
FROM dbo.booking_orders bo
INNER JOIN dbo.users u ON u.user_id = bo.user_id
INNER JOIN dbo.showtimes st ON st.showtime_id = bo.showtime_id
INNER JOIN dbo.movies m ON m.movie_id = st.movie_id
INNER JOIN dbo.rooms r ON r.room_id = st.room_id
INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id;
GO

CREATE VIEW dbo.vw_daily_revenue
AS
WITH Paid AS (
    SELECT
        CAST(p.paid_at AS DATE) AS revenue_date,
        p.booking_id,
        p.amount
    FROM dbo.payments p
    WHERE p.payment_status = 'SUCCESS'
),
Refunded AS (
    SELECT
        r.booking_id,
        SUM(r.refund_amount) AS refunded_amount
    FROM dbo.refunds r
    WHERE r.refund_status = 'SUCCESS'
    GROUP BY r.booking_id
)
SELECT
    p.revenue_date,
    COUNT(DISTINCT p.booking_id) AS total_bookings,
    SUM(p.amount) AS gross_revenue,
    SUM(ISNULL(r.refunded_amount, 0)) AS refunded_amount,
    SUM(p.amount - ISNULL(r.refunded_amount, 0)) AS net_revenue
FROM Paid p
LEFT JOIN Refunded r ON r.booking_id = p.booking_id
GROUP BY p.revenue_date;
GO

/* ============================================================================
   25. SEED CƠ BẢN
   Mật khẩu là placeholder hash. Backend nên tạo seed bằng bcrypt.
   ============================================================================ */

INSERT INTO dbo.roles(role_code, role_name, description)
VALUES
('CUSTOMER', N'Khách hàng', N'Đặt vé và quản lý vé cá nhân'),
('STAFF', N'Nhân viên', N'Quét vé và hỗ trợ vận hành'),
('ADMIN', N'Quản trị viên', N'Quản lý toàn bộ hệ thống');
GO

/* Backend hiện chỉ ghi users.role. Trigger bảo đảm user_roles không bị bỏ trống. */
CREATE OR ALTER TRIGGER dbo.trg_users_sync_role
ON dbo.users
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DELETE ur
    FROM dbo.user_roles ur
    INNER JOIN inserted i ON i.user_id = ur.user_id
    INNER JOIN dbo.roles r ON r.role_id = ur.role_id
    WHERE r.role_code <> i.role;

    INSERT INTO dbo.user_roles(user_id, role_id)
    SELECT i.user_id, r.role_id
    FROM inserted i
    INNER JOIN dbo.roles r ON r.role_code = i.role
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.user_roles ur
        WHERE ur.user_id = i.user_id
          AND ur.role_id = r.role_id
    );
END;
GO

-- ADMIN
/* TẠO TÀI KHOẢN ADMIN NAMCUA */

IF NOT EXISTS (
    SELECT 1
    FROM dbo.roles
    WHERE role_code = 'ADMIN'
)
BEGIN
    THROW 50001, N'Không tìm thấy quyền ADMIN trong bảng roles.', 1;
END;

-- Nếu chưa có tài khoản thì tạo mới
IF NOT EXISTS (
    SELECT 1
    FROM dbo.users
    WHERE email = 'namcua@cinehunt.local'
)
BEGIN
    INSERT INTO dbo.users (
        full_name,
        email,
        phone,
        password_hash,
        email_verified,
        role,
        status
    )
    VALUES (
        N'namcua',
        'namcua@cinehunt.local',
        NULL,
        '$2b$12$I/kU6DQ4k57CEl9.0Jj/tuJcLcp53BjL8XmC.XNihJvWJ9SNiTgKC',
        1,
        'ADMIN',
        'ACTIVE'
    );
END
ELSE
BEGIN
    -- Nếu đã tồn tại thì cập nhật thành ADMIN
    UPDATE dbo.users
    SET
        full_name = N'namcua',
        role = 'ADMIN',
        status = 'ACTIVE',
        email_verified = 1,
        updated_at = SYSDATETIME()
    WHERE email = 'namcua@cinehunt.local';
END;

-- Đồng bộ quyền ADMIN vào bảng user_roles
INSERT INTO dbo.user_roles (
    user_id,
    role_id
)
SELECT
    u.user_id,
    r.role_id
FROM dbo.users AS u
CROSS JOIN dbo.roles AS r
WHERE u.email = 'namcua@cinehunt.local'
  AND r.role_code = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.user_roles AS ur
      WHERE ur.user_id = u.user_id
        AND ur.role_id = r.role_id
  );

-- Kiểm tra kết quả
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.role AS backend_role,
    u.status,
    r.role_id,
    r.role_code
FROM dbo.users AS u
LEFT JOIN dbo.user_roles AS ur
    ON ur.user_id = u.user_id
LEFT JOIN dbo.roles AS r
    ON r.role_id = ur.role_id
WHERE u.email = 'namcua@cinehunt.local';

/* Kiểm tra nhanh user_id = 1 đã có quyền ADMIN trong cả hai mô hình phân quyền. */
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.role AS backend_role,
    r.role_id,
    r.role_code
FROM dbo.users u
LEFT JOIN dbo.user_roles ur ON ur.user_id = u.user_id
LEFT JOIN dbo.roles r ON r.role_id = ur.role_id
WHERE u.user_id = 1;
GO

INSERT INTO dbo.seat_types(type_code, type_name, price_multiplier)
VALUES
('NORMAL', N'Ghế thường', 1.00),
('VIP', N'Ghế VIP', 1.30),
('COUPLE', N'Ghế đôi', 2.00);
GO

INSERT INTO dbo.genres(genre_name, slug)
VALUES
(N'Hành động', 'hanh-dong'),
(N'Hoạt hình', 'hoat-hinh'),
(N'Kinh dị', 'kinh-di'),
(N'Tình cảm', 'tinh-cam'),
(N'Khoa học viễn tưởng', 'khoa-hoc-vien-tuong');
GO


INSERT INTO dbo.concession_combos(combo_name, description, price)
VALUES
(N'Combo Solo', N'1 bắp vừa + 1 nước vừa', 79000),
(N'Combo Couple', N'1 bắp lớn + 2 nước vừa', 129000),
(N'Combo Family', N'2 bắp lớn + 4 nước vừa', 239000);
GO


/* ============================================================================
   25.1. SEED DỮ LIỆU MẪU NGHIỆP VỤ
   Tạo rạp, phòng, ghế, phim, thể loại phim, suất chiếu và ghế theo suất.
   Dữ liệu dùng ngày động để luôn có suất chiếu trong tương lai khi chạy script.
   ============================================================================ */

/* Rạp chiếu */
INSERT INTO dbo.cinemas(
    cinema_name, address, city, district, phone, latitude, longitude, status
)
VALUES
(N'CineHunt Cầu Giấy', N'11 Duy Tân, Dịch Vọng Hậu', N'Hà Nội', N'Cầu Giấy', '02473001234', 21.0309000, 105.7828000, 'ACTIVE'),
(N'CineHunt Hà Đông', N'2 Trần Phú, Mộ Lao', N'Hà Nội', N'Hà Đông', '02473005678', 20.9801000, 105.7909000, 'ACTIVE');
GO

/* Phòng chiếu */
DECLARE @CinemaCauGiay INT = (
    SELECT cinema_id FROM dbo.cinemas WHERE cinema_name = N'CineHunt Cầu Giấy'
);
DECLARE @CinemaHaDong INT = (
    SELECT cinema_id FROM dbo.cinemas WHERE cinema_name = N'CineHunt Hà Đông'
);

INSERT INTO dbo.rooms(cinema_id, room_name, room_type, total_seats, status)
VALUES
(@CinemaCauGiay, N'Phòng 1', 'STANDARD', 20, 'ACTIVE'),
(@CinemaCauGiay, N'Phòng VIP', 'VIP', 12, 'ACTIVE'),
(@CinemaHaDong, N'Phòng 1', 'STANDARD', 20, 'ACTIVE');
GO

/* Ghế cho từng phòng */
DECLARE @NormalSeatTypeId INT = (
    SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'NORMAL'
);
DECLARE @VipSeatTypeId INT = (
    SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'VIP'
);
DECLARE @CoupleSeatTypeId INT = (
    SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'COUPLE'
);

DECLARE @RoomStandard1 INT = (
    SELECT r.room_id
    FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Cầu Giấy' AND r.room_name = N'Phòng 1'
);
DECLARE @RoomVip INT = (
    SELECT r.room_id
    FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Cầu Giấy' AND r.room_name = N'Phòng VIP'
);
DECLARE @RoomStandard2 INT = (
    SELECT r.room_id
    FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Hà Đông' AND r.room_name = N'Phòng 1'
);

/* Phòng chuẩn: A, B ghế thường; C, D ghế VIP */
;WITH RoomList AS (
    SELECT @RoomStandard1 AS room_id
    UNION ALL
    SELECT @RoomStandard2
),
SeatNumbers AS (
    SELECT 1 AS seat_number
    UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
),
SeatRows AS (
    SELECT 'A' AS seat_row, @NormalSeatTypeId AS seat_type_id
    UNION ALL SELECT 'B', @NormalSeatTypeId
    UNION ALL SELECT 'C', @VipSeatTypeId
    UNION ALL SELECT 'D', @VipSeatTypeId
)
INSERT INTO dbo.seats(room_id, seat_type_id, seat_row, seat_number, seat_label, status)
SELECT
    rl.room_id,
    sr.seat_type_id,
    sr.seat_row,
    sn.seat_number,
    CONCAT(sr.seat_row, sn.seat_number),
    'ACTIVE'
FROM RoomList rl
CROSS JOIN SeatRows sr
CROSS JOIN SeatNumbers sn;

/* Phòng VIP: A, B ghế VIP; C1-C2 là ghế đôi */
;WITH VipSeatNumbers AS (
    SELECT 1 AS seat_number
    UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
)
INSERT INTO dbo.seats(room_id, seat_type_id, seat_row, seat_number, seat_label, status)
SELECT @RoomVip, @VipSeatTypeId, 'A', seat_number, CONCAT('A', seat_number), 'ACTIVE'
FROM VipSeatNumbers
UNION ALL
SELECT @RoomVip, @VipSeatTypeId, 'B', seat_number, CONCAT('B', seat_number), 'ACTIVE'
FROM VipSeatNumbers;

INSERT INTO dbo.seats(room_id, seat_type_id, seat_row, seat_number, seat_label, status)
VALUES
(@RoomVip, @CoupleSeatTypeId, 'C', 1, 'C1', 'ACTIVE'),
(@RoomVip, @CoupleSeatTypeId, 'C', 2, 'C2', 'ACTIVE');
GO

/* Phim */
INSERT INTO dbo.movies(
    title, original_title, description, duration_minutes,
    release_date, end_date, age_rating, director, actors,
    country, language, poster_url, banner_url, trailer_url,
    average_rating, status
)
VALUES
(
    N'Đại Chiến Đa Vũ Trụ', N'Multiverse War',
    N'Nhóm anh hùng phải ngăn chặn một sự kiện làm sụp đổ các dòng thời gian.',
    135, DATEADD(DAY, -7, CAST(GETDATE() AS DATE)), DATEADD(DAY, 45, CAST(GETDATE() AS DATE)),
    'T13', N'Nguyễn Minh', N'Anh Tú, Lan Phương, Hoàng Nam',
    N'Việt Nam', N'Tiếng Việt',
    N'https://example.com/posters/multiverse-war.jpg',
    N'https://example.com/banners/multiverse-war.jpg',
    N'https://example.com/trailers/multiverse-war',
    4.30, 'NOW_SHOWING'
),
(
    N'Hành Tinh Xanh', N'The Blue Planet',
    N'Một hành trình khoa học viễn tưởng khám phá hành tinh có sự sống ngoài Trái Đất.',
    120, DATEADD(DAY, -3, CAST(GETDATE() AS DATE)), DATEADD(DAY, 40, CAST(GETDATE() AS DATE)),
    'P', N'Lê Hoàng', N'Minh Khang, Thu Hà',
    N'Việt Nam', N'Tiếng Việt',
    N'https://example.com/posters/blue-planet.jpg',
    N'https://example.com/banners/blue-planet.jpg',
    N'https://example.com/trailers/blue-planet',
    4.10, 'NOW_SHOWING'
),
(
    N'Ngôi Nhà Sau Cánh Rừng', N'The House Beyond The Woods',
    N'Một nhóm bạn trẻ khám phá căn nhà bỏ hoang và đối mặt với bí mật kinh hoàng.',
    105, DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), DATEADD(DAY, 30, CAST(GETDATE() AS DATE)),
    'T16', N'Phạm Quang', N'Bảo Anh, Nhật Minh',
    N'Việt Nam', N'Tiếng Việt',
    N'https://example.com/posters/house-woods.jpg',
    N'https://example.com/banners/house-woods.jpg',
    N'https://example.com/trailers/house-woods',
    3.90, 'NOW_SHOWING'
),
(
    N'Kỷ Nguyên Robot', N'Age of Robots',
    N'Tương lai nơi con người và robot phải hợp tác để bảo vệ thành phố.',
    128, DATEADD(DAY, 20, CAST(GETDATE() AS DATE)), DATEADD(DAY, 80, CAST(GETDATE() AS DATE)),
    'T13', N'Trần Vũ', N'Gia Huy, Mai Anh',
    N'Việt Nam', N'Tiếng Việt',
    N'https://example.com/posters/age-robots.jpg',
    N'https://example.com/banners/age-robots.jpg',
    N'https://example.com/trailers/age-robots',
    0, 'COMING_SOON'
);
GO

/* Gắn thể loại phim */
DECLARE @MovieAction INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Đại Chiến Đa Vũ Trụ');
DECLARE @MoviePlanet INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Hành Tinh Xanh');
DECLARE @MovieHorror INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Ngôi Nhà Sau Cánh Rừng');
DECLARE @MovieRobot INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Kỷ Nguyên Robot');
DECLARE @GenreAction INT = (SELECT genre_id FROM dbo.genres WHERE slug = 'hanh-dong');
DECLARE @GenreAnimation INT = (SELECT genre_id FROM dbo.genres WHERE slug = 'hoat-hinh');
DECLARE @GenreHorror INT = (SELECT genre_id FROM dbo.genres WHERE slug = 'kinh-di');
DECLARE @GenreScifi INT = (SELECT genre_id FROM dbo.genres WHERE slug = 'khoa-hoc-vien-tuong');

INSERT INTO dbo.movie_genres(movie_id, genre_id)
VALUES
(@MovieAction, @GenreAction),
(@MovieAction, @GenreScifi),
(@MoviePlanet, @GenreAnimation),
(@MoviePlanet, @GenreScifi),
(@MovieHorror, @GenreHorror),
(@MovieRobot, @GenreAction),
(@MovieRobot, @GenreScifi);
GO

/* Suất chiếu trong tương lai gần; các khung giờ không trùng nhau trong cùng phòng */
DECLARE @SeedMovie1 INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Đại Chiến Đa Vũ Trụ');
DECLARE @SeedMovie2 INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Hành Tinh Xanh');
DECLARE @SeedMovie3 INT = (SELECT movie_id FROM dbo.movies WHERE title = N'Ngôi Nhà Sau Cánh Rừng');
DECLARE @SeedRoom1 INT = (
    SELECT r.room_id FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Cầu Giấy' AND r.room_name = N'Phòng 1'
);
DECLARE @SeedRoomVip INT = (
    SELECT r.room_id FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Cầu Giấy' AND r.room_name = N'Phòng VIP'
);
DECLARE @SeedRoom2 INT = (
    SELECT r.room_id FROM dbo.rooms r
    INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
    WHERE c.cinema_name = N'CineHunt Hà Đông' AND r.room_name = N'Phòng 1'
);
DECLARE @Tomorrow DATE = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
DECLARE @DayAfterTomorrow DATE = DATEADD(DAY, 2, CAST(GETDATE() AS DATE));

INSERT INTO dbo.showtimes(movie_id, room_id, start_time, end_time, base_price, status)
VALUES
(@SeedMovie1, @SeedRoom1,
 DATEADD(HOUR, 10, CAST(@Tomorrow AS DATETIME2)),
 DATEADD(MINUTE, 150, DATEADD(HOUR, 10, CAST(@Tomorrow AS DATETIME2))),
 80000, 'OPEN'),
(@SeedMovie2, @SeedRoom1,
 DATEADD(HOUR, 14, CAST(@Tomorrow AS DATETIME2)),
 DATEADD(MINUTE, 135, DATEADD(HOUR, 14, CAST(@Tomorrow AS DATETIME2))),
 75000, 'OPEN'),
(@SeedMovie3, @SeedRoomVip,
 DATEADD(HOUR, 19, CAST(@Tomorrow AS DATETIME2)),
 DATEADD(MINUTE, 120, DATEADD(HOUR, 19, CAST(@Tomorrow AS DATETIME2))),
 120000, 'OPEN'),
(@SeedMovie1, @SeedRoom2,
 DATEADD(HOUR, 18, CAST(@DayAfterTomorrow AS DATETIME2)),
 DATEADD(MINUTE, 150, DATEADD(HOUR, 18, CAST(@DayAfterTomorrow AS DATETIME2))),
 85000, 'OPEN');
GO

/* Sinh ghế cho toàn bộ suất chiếu */
INSERT INTO dbo.showtime_seats(showtime_id, seat_id, price, status)
SELECT
    sh.showtime_id,
    s.seat_id,
    CAST(sh.base_price * st.price_multiplier AS DECIMAL(12,2)),
    'AVAILABLE'
FROM dbo.showtimes sh
INNER JOIN dbo.seats s ON s.room_id = sh.room_id
INNER JOIN dbo.seat_types st ON st.seat_type_id = s.seat_type_id
WHERE s.status = 'ACTIVE';
GO

/* Cập nhật đúng tổng số ghế thực tế của từng phòng */
UPDATE r
SET r.total_seats = x.total_seats
FROM dbo.rooms r
INNER JOIN (
    SELECT room_id, COUNT(*) AS total_seats
    FROM dbo.seats
    WHERE status = 'ACTIVE'
    GROUP BY room_id
) x ON x.room_id = r.room_id;
GO

/* Kiểm tra nhanh dữ liệu seed */
SELECT 'cinemas' AS table_name, COUNT(*) AS row_count FROM dbo.cinemas
UNION ALL SELECT 'rooms', COUNT(*) FROM dbo.rooms
UNION ALL SELECT 'seats', COUNT(*) FROM dbo.seats
UNION ALL SELECT 'movies', COUNT(*) FROM dbo.movies
UNION ALL SELECT 'showtimes', COUNT(*) FROM dbo.showtimes
UNION ALL SELECT 'showtime_seats', COUNT(*) FROM dbo.showtime_seats;
GO

/* ============================================================================
   26. KIỂM TRA SAU KHI CÀI ĐẶT
   ============================================================================ */

SELECT
    DB_NAME() AS database_name,
    (SELECT COUNT(*) FROM sys.tables) AS table_count,
    (SELECT COUNT(*) FROM sys.procedures) AS procedure_count,
    (SELECT COUNT(*) FROM sys.views) AS view_count;
GO

PRINT N'CineHunt Database V6.2 Backend Compatible đã được cài đặt thành công.';
GO

SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'booking_orders'
ORDER BY ORDINAL_POSITION
GO

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
/* ============================================================================
   CINEHUNT DATABASE - PATCH V6.5
   Bổ sung: Cơ sở rạp (cinemas), Phòng chiếu (rooms), Ghế (seats)
   Mục tiêu: mô phỏng mô hình chuỗi rạp nhiều cơ sở, nhiều loại phòng
             (Standard / VIP / IMAX / 4DX) như CGV, Beta Cinemas.

   YÊU CẦU: Database CineHuntDB đã được tạo từ file
   CineHunt_Database_V6_3_With_Sample_Data.sql (đã có bảng cinemas, rooms,
   seats, seat_types với dữ liệu seed NORMAL/VIP/COUPLE).

   Script này AN TOÀN chạy lại nhiều lần (idempotent):
   - Rạp mới chỉ thêm nếu chưa tồn tại (theo cinema_name).
   - Phòng mới chỉ thêm nếu chưa tồn tại (theo cinema_id + room_name).
   - Ghế được sinh tự động ngay sau khi phòng đó được tạo mới.
   ============================================================================ */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE CineHuntDB;
GO

/* ============================================================================
   1. THÊM CƠ SỞ RẠP MỚI (nhiều thành phố, giống mô hình chuỗi rạp)
   ============================================================================ */

INSERT INTO dbo.cinemas(cinema_name, address, city, district, phone, latitude, longitude, status)
SELECT v.cinema_name, v.address, v.city, v.district, v.phone, v.latitude, v.longitude, 'ACTIVE'
FROM (VALUES
    (N'CineHunt Vincom Bà Triệu',   N'191 Bà Triệu',            N'Hà Nội',            N'Hai Bà Trưng', '02439746688', 21.0107000, 105.8482000),
    (N'CineHunt Aeon Long Biên',    N'27 Cổ Linh',               N'Hà Nội',            N'Long Biên',    '02436421234', 21.0466000, 105.8935000),
    (N'CineHunt Landmark 81',       N'720A Điện Biên Phủ',       N'TP. Hồ Chí Minh',   N'Bình Thạnh',   '02836221234', 10.7945000, 106.7219000),
    (N'CineHunt Vincom Đồng Khởi',  N'72 Lê Thánh Tôn',          N'TP. Hồ Chí Minh',   N'Quận 1',       '02838271234', 10.7772000, 106.7030000),
    (N'CineHunt Vincom Đà Nẵng',    N'910A Ngô Quyền',           N'Đà Nẵng',           N'Sơn Trà',      '02363771234', 16.0678000, 108.2359000),
    (N'CineHunt Sun World Bà Nà',   N'Suối Mơ, Hòa Ninh',        N'Đà Nẵng',           N'Hòa Vang',     '02363791234', 15.9977000, 107.9928000)
) AS v(cinema_name, address, city, district, phone, latitude, longitude)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.cinemas c WHERE c.cinema_name = v.cinema_name
);
GO

/* ============================================================================
   2. KẾ HOẠCH PHÒNG CHIẾU CHO TỪNG CƠ SỞ
   Mỗi cơ sở có 2-4 phòng: Standard (thường, 2 hàng ghế cuối là VIP),
   VIP (toàn VIP, hàng cuối là ghế đôi - Sweetbox), IMAX, 4DX.
   ============================================================================ */

DECLARE @RoomPlan TABLE (
    seq            INT IDENTITY(1,1),
    cinema_name    NVARCHAR(180),
    room_name      NVARCHAR(100),
    room_type      VARCHAR(30),
    num_rows       INT,          -- số hàng ghế (A, B, C...)
    seats_per_row  INT,          -- số ghế mỗi hàng
    vip_rows       INT,          -- số hàng cuối là ghế VIP
    has_couple_row BIT           -- hàng cuối cùng là ghế đôi (Sweetbox)?
);

INSERT INTO @RoomPlan(cinema_name, room_name, room_type, num_rows, seats_per_row, vip_rows, has_couple_row)
VALUES
-- CineHunt Vincom Bà Triệu
(N'CineHunt Vincom Bà Triệu', N'Phòng 1',    'STANDARD', 8, 10, 2, 0),
(N'CineHunt Vincom Bà Triệu', N'Phòng 2',    'STANDARD', 8, 10, 2, 0),
(N'CineHunt Vincom Bà Triệu', N'Phòng VIP',  'VIP',      6, 8,  6, 1),
(N'CineHunt Vincom Bà Triệu', N'Phòng IMAX', 'IMAX',    10, 14, 2, 0),

-- CineHunt Aeon Long Biên
(N'CineHunt Aeon Long Biên', N'Phòng 1',   'STANDARD', 8, 10, 2, 0),
(N'CineHunt Aeon Long Biên', N'Phòng 2',   'STANDARD', 8, 10, 2, 0),
(N'CineHunt Aeon Long Biên', N'Phòng VIP', 'VIP',      6, 8,  6, 1),

-- CineHunt Landmark 81
(N'CineHunt Landmark 81', N'Phòng 1',    'STANDARD', 8, 10, 2, 0),
(N'CineHunt Landmark 81', N'Phòng 2',    'STANDARD', 8, 10, 2, 0),
(N'CineHunt Landmark 81', N'Phòng VIP',  'VIP',      6, 8,  6, 1),
(N'CineHunt Landmark 81', N'Phòng 4DX',  '4DX',      6, 8,  0, 0),

-- CineHunt Vincom Đồng Khởi
(N'CineHunt Vincom Đồng Khởi', N'Phòng 1',   'STANDARD', 8, 10, 2, 0),
(N'CineHunt Vincom Đồng Khởi', N'Phòng VIP', 'VIP',      6, 8,  6, 1),

-- CineHunt Vincom Đà Nẵng
(N'CineHunt Vincom Đà Nẵng', N'Phòng 1',   'STANDARD', 8, 10, 2, 0),
(N'CineHunt Vincom Đà Nẵng', N'Phòng VIP', 'VIP',      6, 8,  6, 1),

-- CineHunt Sun World Bà Nà
(N'CineHunt Sun World Bà Nà', N'Phòng 1', 'STANDARD', 6, 8, 2, 0);

/* ============================================================================
   3. SINH PHÒNG CHIẾU + GHẾ TỰ ĐỘNG THEO KẾ HOẠCH TRÊN
   ============================================================================ */

DECLARE @NormalSeatTypeId INT = (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'NORMAL');
DECLARE @VipSeatTypeId    INT = (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'VIP');
DECLARE @CoupleSeatTypeId INT = (SELECT seat_type_id FROM dbo.seat_types WHERE type_code = 'COUPLE');

DECLARE @cinema_name     NVARCHAR(180),
        @room_name       NVARCHAR(100),
        @room_type       VARCHAR(30),
        @num_rows        INT,
        @seats_per_row   INT,
        @vip_rows        INT,
        @has_couple_row  BIT,
        @cinema_id       INT,
        @room_id         INT,
        @total_seats     INT;

DECLARE room_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT cinema_name, room_name, room_type, num_rows, seats_per_row, vip_rows, has_couple_row
    FROM @RoomPlan
    ORDER BY seq;

OPEN room_cursor;
FETCH NEXT FROM room_cursor
INTO @cinema_name, @room_name, @room_type, @num_rows, @seats_per_row, @vip_rows, @has_couple_row;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @cinema_id = NULL;
    SET @room_id = NULL;

    SELECT @cinema_id = cinema_id FROM dbo.cinemas WHERE cinema_name = @cinema_name;

    IF @cinema_id IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.rooms WHERE cinema_id = @cinema_id AND room_name = @room_name
       )
    BEGIN
        SET @total_seats = @num_rows * @seats_per_row;

        INSERT INTO dbo.rooms(cinema_id, room_name, room_type, total_seats, status)
        VALUES (@cinema_id, @room_name, @room_type, @total_seats, 'ACTIVE');

        SET @room_id = SCOPE_IDENTITY();

        ;WITH RowLetters AS (
            SELECT n AS rn, CHAR(64 + n) AS row_letter
            FROM (
                SELECT TOP (@num_rows) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
                FROM sys.all_objects
            ) t
        ),
        SeatNumbers AS (
            SELECT TOP (@seats_per_row) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
            FROM sys.all_objects
        )
        INSERT INTO dbo.seats(room_id, seat_type_id, seat_row, seat_number, seat_label, status)
        SELECT
            @room_id,
            CASE
                WHEN @has_couple_row = 1 AND rl.rn = @num_rows THEN @CoupleSeatTypeId
                WHEN rl.rn > (@num_rows - @vip_rows) THEN @VipSeatTypeId
                ELSE @NormalSeatTypeId
            END,
            rl.row_letter,
            sn.n,
            CONCAT(rl.row_letter, sn.n),
            'ACTIVE'
        FROM RowLetters rl
        CROSS JOIN SeatNumbers sn;
    END

    FETCH NEXT FROM room_cursor
    INTO @cinema_name, @room_name, @room_type, @num_rows, @seats_per_row, @vip_rows, @has_couple_row;
END

CLOSE room_cursor;
DEALLOCATE room_cursor;
GO

PRINT N'CineHunt Patch V6.5 — Đã bổ sung cơ sở rạp, phòng chiếu và ghế theo mô hình chuỗi rạp.';
GO

/* ============================================================================
   4. KIỂM TRA NHANH SAU KHI PATCH
   ============================================================================ */

SELECT
    c.cinema_name,
    c.city,
    c.district,
    r.room_name,
    r.room_type,
    r.total_seats,
    COUNT(s.seat_id) AS actual_seat_count
FROM dbo.cinemas c
JOIN dbo.rooms r ON r.cinema_id = c.cinema_id
LEFT JOIN dbo.seats s ON s.room_id = r.room_id
GROUP BY c.cinema_name, c.city, c.district, r.room_name, r.room_type, r.total_seats
ORDER BY c.city, c.cinema_name, r.room_name;
GO

SELECT 'cinemas' AS table_name, COUNT(*) AS row_count FROM dbo.cinemas
UNION ALL SELECT 'rooms', COUNT(*) FROM dbo.rooms
UNION ALL SELECT 'seats', COUNT(*) FROM dbo.seats;
GO
