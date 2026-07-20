/* ============================================================================
   CINEHUNT - BỔ SUNG DỮ LIỆU PHIM TỪ FILE 20bophimsech.pdf
   Giữ nguyên toàn bộ dữ liệu/script hiện có.
   PDF có 20 trang nhưng Doraemon bị lặp ở trang 5 và 20,
   vì vậy chỉ thêm 19 phim duy nhất.
   ============================================================================ */

USE CineHuntDB;
GO

/* ============================================================================
   1. THỂ LOẠI CÒN THIẾU
   Dán khối này SAU khối INSERT INTO dbo.genres hiện tại và trước phần combo.
   ============================================================================ */

INSERT INTO dbo.genres(genre_name, slug)
SELECT src.genre_name, src.slug
FROM (VALUES
    (N'Hồi hộp',   'hoi-hop'),
    (N'Tâm lý',    'tam-ly'),
    (N'Phiêu lưu', 'phieu-luu'),
    (N'Thần thoại','than-thoai'),
    (N'Bí ẩn',     'bi-an'),
    (N'Gia đình',  'gia-dinh'),
    (N'Hải',       'hai-duong'),
    (N'Giật gân',  'giat-gan'),
    (N'Hài',       'hai-kich')
) AS src(genre_name, slug)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.genres g
    WHERE g.slug = src.slug
);
GO

/* ============================================================================
   2. BỔ SUNG 19 PHIM DUY NHẤT
   Dán khối này SAU khối INSERT INTO dbo.movies hiện tại và dòng GO,
   trước phần "Gắn thể loại phim".

   Ghi chú:
   - poster_url/banner_url/trailer_url để NULL vì PDF chỉ chứa hình ảnh,
     không cung cấp URL công khai.
   - end_date tạm tính bằng ngày khởi chiếu + 45 ngày.
   - status được tự tính theo ngày chạy script.
   - "Ám Ảnh" có dòng ngôn ngữ bị ghi nhầm thành thể loại trong PDF,
     nên language để NULL và "Giật gân" được gắn ở phần thể loại.
   - 108 phút 39 giây được làm tròn lên 109 phút vì cột DB là INT.
   ============================================================================ */

DECLARE @Today DATE = CAST(GETDATE() AS DATE);

DECLARE @MovieSeed TABLE (
    title             NVARCHAR(250) NOT NULL,
    original_title    NVARCHAR(250) NULL,
    duration_minutes  INT NOT NULL,
    release_date      DATE NOT NULL,
    age_rating        VARCHAR(10) NULL,
    director          NVARCHAR(150) NULL,
    actors            NVARCHAR(1000) NULL,
    language_name     NVARCHAR(100) NULL
);

INSERT INTO @MovieSeed(
    title, original_title, duration_minutes, release_date,
    age_rating, director, actors, language_name
)
VALUES
(
    N'BACKROOMS: THỰC THỂ QUỶ QUYỆT', N'Backrooms',
    110, '2026-06-26', 'T16',
    N'Kane Parsons',
    N'Chiwetel Ejiofor, Renate Reinsve, Mark Duplass',
    N'Tiếng Anh - Phụ đề Tiếng Việt'
),
(
    N'HUYẾT NGẢI ÁI TÌNH', NULL,
    98, '2026-07-17', 'T18',
    N'Razka Robby Ertanto',
    N'Anjasmara, Lulu Tobing, Carissa Perusset',
    N'Tiếng Indonesia - Phụ đề Tiếng Việt'
),
(
    N'QUỶ BẮT HỒN', NULL,
    103, '2026-07-10', 'T16',
    N'Hải Bùi',
    N'Quang Tuấn, Anh Phạm, Đinh Y Nhung, bé Huy Anh, bé Gia Phong, La Thành, Uy Trần, Sỹ Toàn, Quốc Tân, bé Minh Anh, Ngân Quỳnh, Thanh Châu, Phương Linh',
    N'Tiếng Việt'
),
(
    N'MINIONS & QUÁI VẬT', NULL,
    90, '2026-07-01', 'P',
    N'Pierre Coffin',
    NULL,
    N'Phụ đề Tiếng Việt và Lồng Tiếng Việt'
),
(
    N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)', NULL,
    101, '2026-05-22', 'P',
    N'Tetsuo Yajima',
    N'Wasabi Mizuta, Megumi Oohara, Yumi Kakazu, Subaru Kimura, Tomokazu Seki',
    N'Tiếng Nhật - Phụ đề Tiếng Việt/Lồng tiếng Việt'
),
(
    N'THE ODYSSEY', N'The Odyssey',
    173, '2026-07-17', 'T16',
    N'Christopher Nolan',
    N'Benny Safdie, Anne Hathaway, Matt Damon, Robert Pattinson, Tom Holland, Zendaya, Charlize Theron',
    N'Tiếng Anh - Phụ đề Tiếng Việt'
),
(
    N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ', NULL,
    109, '2026-07-24', 'T13',
    N'Hasui Takahiro',
    N'Minami Takayama, Wakana Yamazaki, Rikiya Koyama, Miyuki Sawashiro, Shin-ichiro Miki',
    N'Tiếng Nhật - Phụ đề Tiếng Việt; Lồng tiếng'
),
(
    N'HÀNH TRÌNH CỦA MOANA', N'Moana',
    116, '2026-07-10', 'K',
    N'Thomas Kail',
    N'Catherine Laga''aia, Dwayne Johnson, John Tui',
    N'Tiếng Anh - Phụ đề Tiếng Việt; Lồng tiếng Việt'
),
(
    N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI', NULL,
    137, '2026-02-27', 'K',
    N'Chung Chí Công',
    N'Võ Phan Kim Khánh, Trần Doãn Hoàng, Nguyễn Hùng',
    N'Tiếng Việt'
),
(
    N'ĐÊM TRUY SÁT', NULL,
    91, '2026-07-17', 'T18',
    N'Adrian Grunberg',
    N'Milla Jovovich, Isabel Myers, Shane Williams',
    N'Tiếng Anh - Phụ đề Tiếng Việt'
),
(
    N'ÁM ẢNH', NULL,
    109, '2026-06-19', 'T18',
    N'Curry Barker',
    N'Michael Johnston, Inde Navarrette, Cooper Tomlinson, Megan Lawless, Andy Richter',
    NULL
),
(
    N'MẸ ƠI, VỀ NHÀ', NULL,
    98, '2026-07-10', 'T16',
    N'Yun Byung Ki',
    N'Lee Yi Kyung, Hoàng Yến Chibi, Choi Daniel, Minh Hà',
    N'Tiếng Hàn - Phụ đề Tiếng Việt'
),
(
    N'MA NỮ OÁN TÌNH', NULL,
    96, '2026-07-10', 'T18',
    N'KrisPond Witthayakhajorndet, KruNing Bhanbhassa Dhubthien, Ping Lumpraploeng',
    N'Engfa Waraha, Apo Nattawin, Freen Sarocha, Jes Jespipat',
    N'Tiếng Thái - Phụ đề Tiếng Việt, Tiếng Anh'
),
(
    N'CÂU CHUYỆN ĐỒ CHƠI 5', N'Toy Story 5',
    102, '2026-06-19', 'P',
    N'Kenna Harris, Andrew Stanton',
    N'Keanu Reeves, Tom Hanks, Annie Potts',
    N'Tiếng Anh - Phụ đề Tiếng Việt và Lồng tiếng Việt'
),
(
    N'COLONY: BẦY XÁC SỐNG', N'Colony',
    122, '2026-06-12', 'T16',
    N'YEON Sang-ho',
    N'Gianna JUN, KOO Kyo-hwan, JI Chang-wook, Shin Hyun-been, KIM Shin-rock, GO Soo',
    N'Tiếng Hàn - Phụ đề Tiếng Việt và Tiếng Anh'
),
(
    N'SUPERGIRL', N'Supergirl',
    108, '2026-06-26', 'T13',
    N'Craig Gillespie',
    N'Milly Alcock, Matthias Schoenaerts, Eve Ridley, David Krumholtz, Emily Beecham, Jason Momoa',
    N'Tiếng Anh - Phụ đề Tiếng Việt'
),
(
    N'LEVITICUS: BÓNG QUỶ', N'Leviticus',
    85, '2026-07-03', 'T18',
    N'Adrian Chiarella',
    N'Joe Bird, Stacy Clausen, Jeremy Blewitt',
    N'Tiếng Anh - Phụ đề Tiếng Việt'
),
(
    N'ĐỒNG DAO MA QUÁI', NULL,
    123, '2026-07-03', 'T18',
    N'Preaw Chanatip Wongpongtree',
    N'Panisara Rikulsurakan, Ongart Jeamcharoenpornkul, Win Sakulsangprapha',
    N'Tiếng Thái - Phụ đề Tiếng Việt'
),
(
    N'LẦU CHÚ HỎA', NULL,
    94, '2026-06-12', 'T18',
    N'Hùng Trần',
    N'Trần Kỳ Anh, Nguyễn Minh Thời, Ngọc Chí Bảo, Phụng Hoàng, Nguyễn Công Nương, Dũng Hà',
    N'Tiếng Việt'
);

INSERT INTO dbo.movies(
    title, original_title, description, duration_minutes,
    release_date, end_date, age_rating, director, actors,
    country, language, poster_url, banner_url, trailer_url,
    average_rating, status
)
SELECT
    s.title,
    s.original_title,
    NULL AS description,
    s.duration_minutes,
    s.release_date,
    DATEADD(DAY, 45, s.release_date) AS end_date,
    s.age_rating,
    s.director,
    s.actors,
    NULL AS country,
    s.language_name,
    NULL AS poster_url,
    NULL AS banner_url,
    NULL AS trailer_url,
    CAST(0 AS DECIMAL(3,2)) AS average_rating,
    CASE
        WHEN @Today < s.release_date THEN 'COMING_SOON'
        WHEN @Today > DATEADD(DAY, 45, s.release_date) THEN 'ENDED'
        ELSE 'NOW_SHOWING'
    END AS status
FROM @MovieSeed s
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.movies m
    WHERE m.title = s.title
);
GO

/* ============================================================================
   3. GẮN THỂ LOẠI CHO 19 PHIM
   Dán khối này SAU phần "Gắn thể loại phim" hiện tại và dòng GO,
   trước phần tạo suất chiếu.
   ============================================================================ */

;WITH MovieGenreSeed AS (
    SELECT *
    FROM (VALUES
        (N'BACKROOMS: THỰC THỂ QUỶ QUYỆT', 'hoi-hop'),
        (N'BACKROOMS: THỰC THỂ QUỶ QUYỆT', 'khoa-hoc-vien-tuong'),
        (N'BACKROOMS: THỰC THỂ QUỶ QUYỆT', 'kinh-di'),

        (N'HUYẾT NGẢI ÁI TÌNH', 'hoi-hop'),
        (N'HUYẾT NGẢI ÁI TÌNH', 'kinh-di'),
        (N'HUYẾT NGẢI ÁI TÌNH', 'tam-ly'),

        (N'QUỶ BẮT HỒN', 'hanh-dong'),
        (N'QUỶ BẮT HỒN', 'kinh-di'),

        (N'MINIONS & QUÁI VẬT', 'hoat-hinh'),

        (N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)', 'hoat-hinh'),
        (N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)', 'phieu-luu'),

        (N'THE ODYSSEY', 'hanh-dong'),
        (N'THE ODYSSEY', 'than-thoai'),

        (N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ', 'bi-an'),
        (N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ', 'hanh-dong'),
        (N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ', 'hoat-hinh'),

        (N'HÀNH TRÌNH CỦA MOANA', 'gia-dinh'),
        (N'HÀNH TRÌNH CỦA MOANA', 'hai-duong'),
        (N'HÀNH TRÌNH CỦA MOANA', 'hanh-dong'),
        (N'HÀNH TRÌNH CỦA MOANA', 'phieu-luu'),

        (N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI', 'gia-dinh'),
        (N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI', 'tinh-cam'),

        (N'ĐÊM TRUY SÁT', 'hanh-dong'),
        (N'ĐÊM TRUY SÁT', 'hoi-hop'),

        (N'ÁM ẢNH', 'hoi-hop'),
        (N'ÁM ẢNH', 'kinh-di'),
        (N'ÁM ẢNH', 'giat-gan'),

        (N'MẸ ƠI, VỀ NHÀ', 'tam-ly'),
        (N'MẸ ƠI, VỀ NHÀ', 'tinh-cam'),

        (N'MA NỮ OÁN TÌNH', 'hai-kich'),
        (N'MA NỮ OÁN TÌNH', 'kinh-di'),
        (N'MA NỮ OÁN TÌNH', 'tam-ly'),

        (N'CÂU CHUYỆN ĐỒ CHƠI 5', 'hoat-hinh'),
        (N'CÂU CHUYỆN ĐỒ CHƠI 5', 'phieu-luu'),

        (N'COLONY: BẦY XÁC SỐNG', 'hanh-dong'),
        (N'COLONY: BẦY XÁC SỐNG', 'hoi-hop'),
        (N'COLONY: BẦY XÁC SỐNG', 'khoa-hoc-vien-tuong'),

        (N'SUPERGIRL', 'hanh-dong'),
        (N'SUPERGIRL', 'phieu-luu'),

        (N'LEVITICUS: BÓNG QUỶ', 'kinh-di'),

        (N'ĐỒNG DAO MA QUÁI', 'hoi-hop'),
        (N'ĐỒNG DAO MA QUÁI', 'kinh-di'),
        (N'ĐỒNG DAO MA QUÁI', 'than-thoai'),

        (N'LẦU CHÚ HỎA', 'bi-an'),
        (N'LẦU CHÚ HỎA', 'kinh-di')
    ) AS src(movie_title, genre_slug)
)
INSERT INTO dbo.movie_genres(movie_id, genre_id)
SELECT
    m.movie_id,
    g.genre_id
FROM MovieGenreSeed src
INNER JOIN dbo.movies m
    ON m.title = src.movie_title
INNER JOIN dbo.genres g
    ON g.slug = src.genre_slug
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.movie_genres mg
    WHERE mg.movie_id = m.movie_id
      AND mg.genre_id = g.genre_id
);
GO

/* ============================================================================
   4. KIỂM TRA SAU KHI THÊM
   ============================================================================ */

SELECT
    m.movie_id,
    m.title,
    m.duration_minutes,
    m.release_date,
    m.end_date,
    m.age_rating,
    m.status,
    STRING_AGG(g.genre_name, N', ') AS genres
FROM dbo.movies m
LEFT JOIN dbo.movie_genres mg
    ON mg.movie_id = m.movie_id
LEFT JOIN dbo.genres g
    ON g.genre_id = mg.genre_id
WHERE m.title IN (
    N'BACKROOMS: THỰC THỂ QUỶ QUYỆT',
    N'HUYẾT NGẢI ÁI TÌNH',
    N'QUỶ BẮT HỒN',
    N'MINIONS & QUÁI VẬT',
    N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)',
    N'THE ODYSSEY',
    N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ',
    N'HÀNH TRÌNH CỦA MOANA',
    N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI',
    N'ĐÊM TRUY SÁT',
    N'ÁM ẢNH',
    N'MẸ ƠI, VỀ NHÀ',
    N'MA NỮ OÁN TÌNH',
    N'CÂU CHUYỆN ĐỒ CHƠI 5',
    N'COLONY: BẦY XÁC SỐNG',
    N'SUPERGIRL',
    N'LEVITICUS: BÓNG QUỶ',
    N'ĐỒNG DAO MA QUÁI',
    N'LẦU CHÚ HỎA'
)
GROUP BY
    m.movie_id,
    m.title,
    m.duration_minutes,
    m.release_date,
    m.end_date,
    m.age_rating,
    m.status
ORDER BY m.release_date, m.title;
GO

/* ============================================================================
   5. TẠO SUẤT CHIẾU CHO 19 PHIM MỚI
   - Dùng 3 phòng hiện có trong dữ liệu mẫu.
   - Mỗi phim có 1 suất chiếu.
   - Có NOT EXISTS nên chạy lại không tạo trùng.
   - end_time = start_time + duration_minutes + 15 phút dọn phòng.
   ============================================================================ */

DECLARE @BaseDate DATE = CAST(GETDATE() AS DATE);

DECLARE @CinemaCauGiayId INT = (
    SELECT cinema_id
    FROM dbo.cinemas
    WHERE cinema_name = N'CineHunt Cầu Giấy'
);

DECLARE @CinemaHaDongId INT = (
    SELECT cinema_id
    FROM dbo.cinemas
    WHERE cinema_name = N'CineHunt Hà Đông'
);

DECLARE @RoomCG1 INT = (
    SELECT room_id
    FROM dbo.rooms
    WHERE cinema_id = @CinemaCauGiayId
      AND room_name = N'Phòng 1'
);

DECLARE @RoomVIP INT = (
    SELECT room_id
    FROM dbo.rooms
    WHERE cinema_id = @CinemaCauGiayId
      AND room_name = N'Phòng VIP'
);

DECLARE @RoomHD1 INT = (
    SELECT room_id
    FROM dbo.rooms
    WHERE cinema_id = @CinemaHaDongId
      AND room_name = N'Phòng 1'
);

IF @RoomCG1 IS NULL OR @RoomVIP IS NULL OR @RoomHD1 IS NULL
BEGIN
    THROW 51010, N'Không tìm đủ 3 phòng mẫu để tạo suất chiếu.', 1;
END;
GO

DECLARE @BaseDate2 DATE = CAST(GETDATE() AS DATE);

DECLARE @ScheduleSeed TABLE (
    movie_title NVARCHAR(250) NOT NULL,
    room_code   VARCHAR(10) NOT NULL,
    day_offset  INT NOT NULL,
    start_hour  INT NOT NULL,
    base_price  DECIMAL(12,2) NOT NULL
);

INSERT INTO @ScheduleSeed(movie_title, room_code, day_offset, start_hour, base_price)
VALUES
(N'BACKROOMS: THỰC THỂ QUỶ QUYỆT', 'CG1', 1, 18, 85000),
(N'HUYẾT NGẢI ÁI TÌNH', 'VIP', 1, 19, 120000),
(N'QUỶ BẮT HỒN', 'HD1', 1, 18, 80000),

(N'MINIONS & QUÁI VẬT', 'CG1', 2, 18, 75000),
(N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)', 'VIP', 2, 19, 110000),
(N'THE ODYSSEY', 'HD1', 2, 18, 95000),

(N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ', 'CG1', 4, 18, 85000),
(N'HÀNH TRÌNH CỦA MOANA', 'VIP', 3, 19, 115000),
(N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI', 'HD1', 3, 18, 80000),

(N'ĐÊM TRUY SÁT', 'CG1', 4, 21, 90000),
(N'ÁM ẢNH', 'VIP', 4, 19, 120000),
(N'MẸ ƠI, VỀ NHÀ', 'HD1', 4, 18, 80000),

(N'MA NỮ OÁN TÌNH', 'CG1', 5, 18, 90000),
(N'CÂU CHUYỆN ĐỒ CHƠI 5', 'VIP', 5, 19, 110000),
(N'COLONY: BẦY XÁC SỐNG', 'HD1', 5, 18, 85000),

(N'SUPERGIRL', 'CG1', 6, 18, 90000),
(N'LEVITICUS: BÓNG QUỶ', 'VIP', 6, 19, 120000),
(N'ĐỒNG DAO MA QUÁI', 'HD1', 6, 18, 85000),

(N'LẦU CHÚ HỎA', 'CG1', 7, 18, 85000);

;WITH PreparedSchedule AS (
    SELECT
        m.movie_id,
        CASE s.room_code
            WHEN 'CG1' THEN (
                SELECT r.room_id
                FROM dbo.rooms r
                INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
                WHERE c.cinema_name = N'CineHunt Cầu Giấy'
                  AND r.room_name = N'Phòng 1'
            )
            WHEN 'VIP' THEN (
                SELECT r.room_id
                FROM dbo.rooms r
                INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
                WHERE c.cinema_name = N'CineHunt Cầu Giấy'
                  AND r.room_name = N'Phòng VIP'
            )
            WHEN 'HD1' THEN (
                SELECT r.room_id
                FROM dbo.rooms r
                INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
                WHERE c.cinema_name = N'CineHunt Hà Đông'
                  AND r.room_name = N'Phòng 1'
            )
        END AS room_id,
        DATEADD(
            HOUR,
            s.start_hour,
            CAST(
                CASE
                    WHEN DATEADD(DAY, s.day_offset, @BaseDate2) < ISNULL(m.release_date, @BaseDate2)
                        THEN m.release_date
                    ELSE DATEADD(DAY, s.day_offset, @BaseDate2)
                END
                AS DATETIME2
            )
        ) AS start_time,
        m.duration_minutes,
        s.base_price
    FROM @ScheduleSeed s
    INNER JOIN dbo.movies m ON m.title = s.movie_title
)
INSERT INTO dbo.showtimes(
    movie_id,
    room_id,
    start_time,
    end_time,
    base_price,
    status
)
SELECT
    p.movie_id,
    p.room_id,
    p.start_time,
    DATEADD(MINUTE, p.duration_minutes + 15, p.start_time),
    p.base_price,
    'OPEN'
FROM PreparedSchedule p
WHERE p.room_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.showtimes sh
      WHERE sh.movie_id = p.movie_id
        AND sh.room_id = p.room_id
        AND sh.start_time = p.start_time
  );
GO

/* Sinh ghế cho mọi suất chiếu còn thiếu ghế */
INSERT INTO dbo.showtime_seats(
    showtime_id,
    seat_id,
    price,
    status
)
SELECT
    sh.showtime_id,
    s.seat_id,
    CAST(sh.base_price * st.price_multiplier AS DECIMAL(12,2)),
    'AVAILABLE'
FROM dbo.showtimes sh
INNER JOIN dbo.seats s
    ON s.room_id = sh.room_id
INNER JOIN dbo.seat_types st
    ON st.seat_type_id = s.seat_type_id
WHERE s.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.showtime_seats ss
      WHERE ss.showtime_id = sh.showtime_id
        AND ss.seat_id = s.seat_id
  );
GO

/* Kiểm tra suất chiếu mới */
SELECT
    sh.showtime_id,
    m.title,
    c.cinema_name,
    r.room_name,
    sh.start_time,
    sh.end_time,
    sh.base_price,
    sh.status,
    COUNT(ss.showtime_seat_id) AS seat_count
FROM dbo.showtimes sh
INNER JOIN dbo.movies m ON m.movie_id = sh.movie_id
INNER JOIN dbo.rooms r ON r.room_id = sh.room_id
INNER JOIN dbo.cinemas c ON c.cinema_id = r.cinema_id
LEFT JOIN dbo.showtime_seats ss ON ss.showtime_id = sh.showtime_id
WHERE m.title IN (
    N'BACKROOMS: THỰC THỂ QUỶ QUYỆT',
    N'HUYẾT NGẢI ÁI TÌNH',
    N'QUỶ BẮT HỒN',
    N'MINIONS & QUÁI VẬT',
    N'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)',
    N'THE ODYSSEY',
    N'PHIM ĐIỆN ẢNH THÁM TỬ LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ',
    N'HÀNH TRÌNH CỦA MOANA',
    N'CẢM ƠN NGƯỜI ĐÃ THỨC CÙNG TÔI',
    N'ĐÊM TRUY SÁT',
    N'ÁM ẢNH',
    N'MẸ ƠI, VỀ NHÀ',
    N'MA NỮ OÁN TÌNH',
    N'CÂU CHUYỆN ĐỒ CHƠI 5',
    N'COLONY: BẦY XÁC SỐNG',
    N'SUPERGIRL',
    N'LEVITICUS: BÓNG QUỶ',
    N'ĐỒNG DAO MA QUÁI',
    N'LẦU CHÚ HỎA'
)
GROUP BY
    sh.showtime_id,
    m.title,
    c.cinema_name,
    r.room_name,
    sh.start_time,
    sh.end_time,
    sh.base_price,
    sh.status
ORDER BY sh.start_time, c.cinema_name, r.room_name;
GO

/* ============================================================================
   6. FIX DATABASE CHO LUỒNG BOOKING / THANH TOÁN
   ============================================================================ */

IF OBJECT_ID(N'dbo.seat_holds', N'U') IS NULL
BEGIN
    THROW 51001, N'Không tìm thấy bảng dbo.seat_holds trong CineHuntDB.', 1;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_seat_holds_status'
      AND parent_object_id = OBJECT_ID(N'dbo.seat_holds')
)
BEGIN
    ALTER TABLE dbo.seat_holds
    DROP CONSTRAINT CK_seat_holds_status;
END;
GO

ALTER TABLE dbo.seat_holds WITH CHECK
ADD CONSTRAINT CK_seat_holds_status CHECK (
    status IN (
        'ACTIVE',
        'CONVERTED',
        'CONFIRMED',
        'EXPIRED',
        'CANCELLED',
        'RELEASED'
    )
);
GO

ALTER TABLE dbo.seat_holds
CHECK CONSTRAINT CK_seat_holds_status;
GO

/* Kiểm tra database sau khi sửa */
SELECT
    cc.name AS constraint_name,
    cc.definition,
    cc.is_disabled,
    cc.is_not_trusted
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.seat_holds')
  AND cc.name = N'CK_seat_holds_status';
GO

SELECT status, COUNT(*) AS total
FROM dbo.seat_holds
GROUP BY status
ORDER BY status;
GO

SELECT status, COUNT(*) AS total
FROM dbo.showtime_seats
GROUP BY status
ORDER BY status;
GO
