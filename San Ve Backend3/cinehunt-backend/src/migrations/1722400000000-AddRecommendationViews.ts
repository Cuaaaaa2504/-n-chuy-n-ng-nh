// src/migrations/1722400000000-AddRecommendationViews.ts
//
// VÁ MỤC #5 CỦA BÁO CÁO — "Database chưa có lớp hỗ trợ riêng cho recommendation".
//
// Hiện trạng trước migration này: mọi câu SQL phục vụ gợi ý đều nằm rải rác
// trong `recommendation-service/app/db.py` dưới dạng chuỗi thô. Ba câu khác
// nhau (load_interactions, load_movies, load_popular_movie_ids) cùng lặp lại
// một logic join `booking_orders -> showtimes -> movies` và cùng hardcode bộ
// lọc trạng thái. Đổi schema một lần là phải đi sửa ba chỗ, quên một chỗ thì
// model train trên dữ liệu sai mà không có gì báo lỗi.
//
// Ba view dưới đây đóng gói đúng phần logic đó lại. Chúng KHÔNG thay đổi kết
// quả — cố tình giữ nguyên 100% ngữ nghĩa của db.py để có thể chuyển sang
// dùng view mà không phải train lại model.
//
// VÌ SAO LÀ VIEW CHỨ KHÔNG PHẢI BẢNG VẬT LÝ / MATERIALIZED VIEW:
//   - Dữ liệu đặt vé thay đổi liên tục, bảng vật lý sẽ cũ ngay.
//   - SQL Server gọi materialized view là "indexed view", nó bắt buộc
//     SCHEMABINDING và CẤM dùng COUNT(DISTINCT ...), STRING_AGG, subquery.
//     Cả ba view ở đây đều vi phạm ít nhất một điều kiện -> không index được.
//     Đây là view thường, tính lúc query. Với quy mô một đồ án thì thừa đủ;
//     bảng cache `movie_recommendations` mới là nơi chịu tải đọc thật sự.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecommendationViews1722400000000 implements MigrationInterface {
  name = 'AddRecommendationViews1722400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kiểm tra bảng nền giống migration 1722200000000: chạy migration trước
    // file SQL V6.3 thì lỗi trả về sẽ là "Invalid object name 'dbo.showtimes'",
    // không nói cho người chạy biết phải làm gì.
    const [check] = await queryRunner.query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.booking_orders', 'U') IS NULL THEN 1 ELSE 0 END AS missing_orders,
        CASE WHEN OBJECT_ID('dbo.showtimes',      'U') IS NULL THEN 1 ELSE 0 END AS missing_showtimes,
        CASE WHEN OBJECT_ID('dbo.movies',         'U') IS NULL THEN 1 ELSE 0 END AS missing_movies,
        CASE WHEN OBJECT_ID('dbo.movie_genres',   'U') IS NULL THEN 1 ELSE 0 END AS missing_movie_genres
    `);

    const missing: string[] = [];
    if (Number(check.missing_orders) === 1) missing.push('dbo.booking_orders');
    if (Number(check.missing_showtimes) === 1) missing.push('dbo.showtimes');
    if (Number(check.missing_movies) === 1) missing.push('dbo.movies');
    if (Number(check.missing_movie_genres) === 1)
      missing.push('dbo.movie_genres');

    if (missing.length > 0) {
      throw new Error(
        `Không tạo được view gợi ý vì thiếu bảng: ${missing.join(', ')}.\n` +
          `Hãy chạy file CineHunt_Database_V6_3_With_Sample_Data.sql trong SSMS trước, ` +
          `rồi mới chạy "npm run migration:run".`,
      );
    }

    /* ======================================================================
     * VIEW 1 — vw_recommendation_interactions
     * ----------------------------------------------------------------------
     * Ma trận tương tác user x movie, tương đương `db.py :: load_interactions()`.
     *
     * LƯU Ý VỀ CỘT `implicit_rating`:
     * CineHunt KHÔNG có bảng rating (kiểm tra file SQL V6.3: 28 bảng, không
     * bảng nào lưu điểm người dùng chấm). Notebook v7 lại được train trên
     * MovieLens có cột Rating 1..5. Công thức quy đổi
     *
     *     3.5 + 0.5 * (số lần đặt vé - 1),  trần 5.0
     *
     * hiện đang nằm trong Python (`df["rating"] = ...`). Đưa nó xuống view để
     * chỉ còn MỘT định nghĩa duy nhất — nếu sau này ai đó đổi công thức bên
     * Python mà quên đổi ở đây (hoặc ngược lại), hai bên vẫn khớp vì Python
     * sẽ đọc thẳng cột này.
     *
     * Chỉ tính đơn PAID/ISSUED. Đơn PENDING_PAYMENT có thể không bao giờ được
     * trả tiền; CANCELLED/REFUNDED là tín hiệu ngược, đếm vào là dạy model học
     * điều sai.
     * ==================================================================== */
    await queryRunner.query(`
      CREATE OR ALTER VIEW dbo.vw_recommendation_interactions
      AS
      SELECT
          bo.user_id                                        AS user_id,
          st.movie_id                                       AS movie_id,
          COUNT(DISTINCT bo.booking_id)                     AS booking_count,
          MAX(bo.created_at)                                AS last_booked_at,
          CASE
            WHEN 3.5 + 0.5 * (COUNT(DISTINCT bo.booking_id) - 1) > 5.0
              THEN CAST(5.0 AS DECIMAL(3,2))
            ELSE CAST(3.5 + 0.5 * (COUNT(DISTINCT bo.booking_id) - 1) AS DECIMAL(3,2))
          END                                               AS implicit_rating
      FROM dbo.booking_orders AS bo
      INNER JOIN dbo.showtimes AS st
              ON st.showtime_id = bo.showtime_id
      INNER JOIN dbo.users AS u
              ON u.user_id = bo.user_id
             AND u.status  = 'ACTIVE'
      WHERE bo.status IN ('PAID', 'ISSUED')
      GROUP BY bo.user_id, st.movie_id
    `);

    /* ======================================================================
     * VIEW 2 — vw_movie_content_features
     * ----------------------------------------------------------------------
     * Danh mục phim + vector thể loại dạng chuỗi, tương đương
     * `db.py :: load_movies()`. Đây là đầu vào của nhánh Content-based.
     *
     * STRING_AGG yêu cầu SQL Server 2017 trở lên. DB của đồ án chạy trên
     * 2019/2022 nên dùng được. Nếu bắt buộc phải chạy trên 2016 thì thay bằng
     * FOR XML PATH — nhưng đừng đổi dấu phân tách '|', bên Python đang
     * `str.split("|")`.
     *
     * LỌC ENDED/HIDDEN NGAY Ở ĐÂY: gợi ý một phim đã ngừng chiếu thì người
     * dùng bấm vào chỉ thấy trang trống — tệ hơn là không gợi ý gì cả.
     * ==================================================================== */
    await queryRunner.query(`
      CREATE OR ALTER VIEW dbo.vw_movie_content_features
      AS
      SELECT
          m.movie_id                                        AS movie_id,
          m.title                                           AS title,
          m.status                                          AS status,
          CAST(m.average_rating AS FLOAT)                   AS average_rating,
          ISNULL(
            STRING_AGG(CAST(g.genre_name AS NVARCHAR(MAX)), '|'),
            N''
          )                                                 AS genres
      FROM dbo.movies AS m
      LEFT JOIN dbo.movie_genres AS mg ON mg.movie_id = m.movie_id
      LEFT JOIN dbo.genres       AS g  ON g.genre_id  = mg.genre_id
      WHERE m.status IN ('NOW_SHOWING', 'COMING_SOON')
      GROUP BY m.movie_id, m.title, m.status, m.average_rating
    `);

    /* ======================================================================
     * VIEW 3 — vw_movie_popularity_90d
     * ----------------------------------------------------------------------
     * VÁ MỤC #6 CỦA BÁO CÁO Ở TẦNG DATABASE — cold-start fallback.
     *
     * Tương đương `db.py :: load_popular_movie_ids()`, nhưng KHÔNG có TOP (n)
     * và không ORDER BY. Đây là chủ ý, không phải thiếu sót:
     *
     *   1. SQL Server CẤM ORDER BY trong view trừ khi đi kèm TOP, và kể cả có
     *      TOP thì thứ tự vẫn KHÔNG được đảm bảo khi select lại từ view.
     *      Ai tin vào thứ tự đó sẽ nhận bug ngẫu nhiên chỉ xuất hiện khi dữ
     *      liệu đủ lớn để optimizer đổi kế hoạch thực thi.
     *   2. Cột `booking_count` đã có sẵn -> phía gọi tự
     *      `ORDER BY booking_count DESC` kèm `TOP (@limit)` của riêng nó.
     *
     * Cửa sổ 90 ngày cố tình đặt trong view: "phổ biến" phải là phổ biến
     * GẦN ĐÂY. Đếm từ đầu lịch sử thì một bom tấn hai năm trước sẽ chiếm chỗ
     * vĩnh viễn trên trang chủ.
     * ==================================================================== */
    await queryRunner.query(`
      CREATE OR ALTER VIEW dbo.vw_movie_popularity_90d
      AS
      SELECT
          st.movie_id                                       AS movie_id,
          COUNT(*)                                          AS booking_count,
          COUNT(DISTINCT bo.user_id)                        AS distinct_users,
          MAX(bo.created_at)                                AS last_booked_at
      FROM dbo.booking_orders AS bo
      INNER JOIN dbo.showtimes AS st ON st.showtime_id = bo.showtime_id
      INNER JOIN dbo.movies    AS m  ON m.movie_id     = st.movie_id
      WHERE bo.status IN ('PAID', 'ISSUED')
        AND bo.created_at >= DATEADD(DAY, -90, SYSDATETIME())
        AND m.status IN ('NOW_SHOWING', 'COMING_SOON')
      GROUP BY st.movie_id
    `);

    /* ======================================================================
     * Index hỗ trợ.
     * ----------------------------------------------------------------------
     * Cả ba view đều bắt đầu bằng cùng một phép join trên
     * `booking_orders.showtime_id` và lọc theo `status` + `created_at`.
     * Không có index này thì mỗi lần train là một lần table scan toàn bộ
     * bảng đơn hàng.
     *
     * INCLUDE (user_id, booking_id) biến nó thành covering index cho view 1:
     * SQL Server lấy đủ dữ liệu từ index, không phải lookup ngược về bảng gốc.
     * ==================================================================== */
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_booking_orders_status_created_showtime'
          AND object_id = OBJECT_ID('dbo.booking_orders')
      )
      BEGIN
        CREATE INDEX IX_booking_orders_status_created_showtime
          ON dbo.booking_orders (status, created_at, showtime_id)
          INCLUDE (user_id, booking_id);
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Thứ tự ngược lại với up(). DROP VIEW không kéo theo gì khác vì không
    // view nào ở đây dùng SCHEMABINDING.
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_booking_orders_status_created_showtime'
          AND object_id = OBJECT_ID('dbo.booking_orders')
      )
      DROP INDEX IX_booking_orders_status_created_showtime ON dbo.booking_orders;
    `);
    await queryRunner.query(
      `IF OBJECT_ID('dbo.vw_movie_popularity_90d', 'V') IS NOT NULL DROP VIEW dbo.vw_movie_popularity_90d;`,
    );
    await queryRunner.query(
      `IF OBJECT_ID('dbo.vw_movie_content_features', 'V') IS NOT NULL DROP VIEW dbo.vw_movie_content_features;`,
    );
    await queryRunner.query(
      `IF OBJECT_ID('dbo.vw_recommendation_interactions', 'V') IS NOT NULL DROP VIEW dbo.vw_recommendation_interactions;`,
    );
  }
}
