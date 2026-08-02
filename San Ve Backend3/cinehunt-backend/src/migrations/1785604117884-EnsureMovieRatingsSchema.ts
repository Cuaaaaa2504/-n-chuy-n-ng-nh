import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureMovieRatingsSchema1785604117884
  implements MigrationInterface
{
  name = 'EnsureMovieRatingsSchema1785604117884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
     * Kiểm tra các bảng/cột nền tảng.
     * Migration sẽ dừng thay vì tạo schema nửa vời.
     */
    await queryRunner.query(`
      IF OBJECT_ID(N'dbo.movies', N'U') IS NULL
      BEGIN
        THROW 52000,
          N'Không thể tạo movie_ratings vì bảng dbo.movies chưa tồn tại.',
          1;
      END;

      IF OBJECT_ID(N'dbo.users', N'U') IS NULL
      BEGIN
        THROW 52001,
          N'Không thể tạo movie_ratings vì bảng dbo.users chưa tồn tại.',
          1;
      END;

      IF COL_LENGTH(N'dbo.movies', N'average_rating') IS NULL
      BEGIN
        THROW 52002,
          N'Không thể đồng bộ đánh giá vì dbo.movies.average_rating chưa tồn tại.',
          1;
      END;
    `);

    /*
     * Chỉ tạo bảng trên database cũ chưa có tính năng rating.
     * Database hiện tại của bạn đã có bảng nên đoạn này sẽ được bỏ qua.
     */
    await queryRunner.query(`
      IF OBJECT_ID(N'dbo.movie_ratings', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.movie_ratings (
          rating_id BIGINT IDENTITY(1,1) NOT NULL,
          movie_id INT NOT NULL,
          user_id INT NOT NULL,
          stars TINYINT NOT NULL,

          created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_movie_ratings_created_at
            DEFAULT SYSDATETIME(),

          updated_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_movie_ratings_updated_at
            DEFAULT SYSDATETIME(),

          CONSTRAINT PK_movie_ratings
            PRIMARY KEY (rating_id),

          CONSTRAINT UQ_movie_ratings_movie_user
            UNIQUE (movie_id, user_id),

          CONSTRAINT CK_movie_ratings_stars
            CHECK (stars BETWEEN 1 AND 5),

          CONSTRAINT FK_movie_ratings_movie
            FOREIGN KEY (movie_id)
            REFERENCES dbo.movies(movie_id)
            ON DELETE CASCADE,

          CONSTRAINT FK_movie_ratings_user
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id)
            ON DELETE CASCADE
        );
      END;
    `);

    /*
     * Tạo index nếu chưa có.
     */
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_movie_ratings_user_updated'
          AND object_id = OBJECT_ID(N'dbo.movie_ratings')
      )
      BEGIN
        CREATE INDEX IX_movie_ratings_user_updated
        ON dbo.movie_ratings(user_id, updated_at DESC)
        INCLUDE (movie_id, stars);
      END;
    `);

    /*
     * Trigger phải nằm trong một query riêng vì SQL Server yêu cầu
     * CREATE OR ALTER TRIGGER là câu lệnh đầu tiên trong batch.
     */
    await queryRunner.query(`
      CREATE OR ALTER TRIGGER dbo.trg_movie_ratings_sync_average
      ON dbo.movie_ratings
      AFTER INSERT, UPDATE, DELETE
      AS
      BEGIN
        SET NOCOUNT ON;

        ;WITH changed_movies AS (
          SELECT movie_id
          FROM inserted

          UNION

          SELECT movie_id
          FROM deleted
        ),
        rating_summary AS (
          SELECT
            mr.movie_id,
            AVG(
              CAST(mr.stars AS DECIMAL(10,4))
            ) AS average_stars
          FROM dbo.movie_ratings AS mr
          INNER JOIN changed_movies AS cm
            ON cm.movie_id = mr.movie_id
          GROUP BY mr.movie_id
        )
        UPDATE m
        SET
          m.average_rating = CAST(
            COALESCE(rs.average_stars, 0)
            AS DECIMAL(3,2)
          ),
          m.updated_at = SYSDATETIME()
        FROM dbo.movies AS m
        INNER JOIN changed_movies AS cm
          ON cm.movie_id = m.movie_id
        LEFT JOIN rating_summary AS rs
          ON rs.movie_id = m.movie_id;
      END;
    `);

    /*
     * Đồng bộ lại average_rating cho dữ liệu rating đã tồn tại.
     */
    await queryRunner.query(`
      ;WITH rating_summary AS (
        SELECT
          movie_id,
          AVG(
            CAST(stars AS DECIMAL(10,4))
          ) AS average_stars
        FROM dbo.movie_ratings
        GROUP BY movie_id
      )
      UPDATE m
      SET
        m.average_rating = CAST(
          COALESCE(rs.average_stars, 0)
          AS DECIMAL(3,2)
        ),
        m.updated_at = SYSDATETIME()
      FROM dbo.movies AS m
      LEFT JOIN rating_summary AS rs
        ON rs.movie_id = m.movie_id;
    `);

    /*
     * Lấy điểm trung bình, tổng lượt đánh giá và điểm của user hiện tại.
     */
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_get_movie_rating
        @movie_id INT,
        @user_id INT = NULL
      AS
      BEGIN
        SET NOCOUNT ON;

        IF NOT EXISTS (
          SELECT 1
          FROM dbo.movies
          WHERE movie_id = @movie_id
        )
        BEGIN
          THROW 51050, N'Không tìm thấy phim.', 1;
        END;

        SELECT
          m.movie_id,

          CAST(
            m.average_rating AS DECIMAL(3,2)
          ) AS average_stars,

          CAST(
            m.average_rating * 2 AS DECIMAL(4,2)
          ) AS average_score,

          COUNT(r.rating_id) AS rating_count,

          MAX(
            CASE
              WHEN @user_id IS NOT NULL
                AND r.user_id = @user_id
              THEN CAST(r.stars AS INT)
              ELSE NULL
            END
          ) AS my_rating

        FROM dbo.movies AS m

        LEFT JOIN dbo.movie_ratings AS r
          ON r.movie_id = m.movie_id

        WHERE m.movie_id = @movie_id

        GROUP BY
          m.movie_id,
          m.average_rating;
      END;
    `);

    /*
     * Thêm mới hoặc cập nhật rating trong transaction.
     */
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_upsert_movie_rating
        @movie_id INT,
        @user_id INT,
        @stars TINYINT
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        IF @stars NOT BETWEEN 1 AND 5
        BEGIN
          THROW 51051,
            N'Số sao phải nằm trong khoảng từ 1 đến 5.',
            1;
        END;

        IF NOT EXISTS (
          SELECT 1
          FROM dbo.movies
          WHERE movie_id = @movie_id
        )
        BEGIN
          THROW 51052, N'Không tìm thấy phim.', 1;
        END;

        IF NOT EXISTS (
          SELECT 1
          FROM dbo.users
          WHERE user_id = @user_id
            AND status <> 'DELETED'
        )
        BEGIN
          THROW 51053,
            N'Không tìm thấy người dùng hợp lệ.',
            1;
        END;

        BEGIN TRANSACTION;

        IF EXISTS (
          SELECT 1
          FROM dbo.movie_ratings
            WITH (UPDLOCK, HOLDLOCK)
          WHERE movie_id = @movie_id
            AND user_id = @user_id
        )
        BEGIN
          UPDATE dbo.movie_ratings
          SET
            stars = @stars,
            updated_at = SYSDATETIME()
          WHERE movie_id = @movie_id
            AND user_id = @user_id;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.movie_ratings (
            movie_id,
            user_id,
            stars
          )
          VALUES (
            @movie_id,
            @user_id,
            @stars
          );
        END;

        COMMIT TRANSACTION;

        EXEC dbo.sp_get_movie_rating
          @movie_id = @movie_id,
          @user_id = @user_id;
      END;
    `);

    /*
     * Xóa rating của user.
     */
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_delete_movie_rating
        @movie_id INT,
        @user_id INT
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        DELETE FROM dbo.movie_ratings
        WHERE movie_id = @movie_id
          AND user_id = @user_id;

        EXEC dbo.sp_get_movie_rating
          @movie_id = @movie_id,
          @user_id = @user_id;
      END;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'EnsureMovieRatingsSchema là migration dữ liệu không thể revert tự động an toàn.',
    );
  }
}
