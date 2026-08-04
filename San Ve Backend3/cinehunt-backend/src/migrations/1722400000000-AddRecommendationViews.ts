
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecommendationViews1722400000000 implements MigrationInterface {
  name = 'AddRecommendationViews1722400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
