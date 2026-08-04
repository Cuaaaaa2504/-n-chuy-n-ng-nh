// src/migrations/1722200000000-AddMovieRecommendations.ts
// Số 1722200000000 ở đầu tên file là timestamp milliseconds — TypeORM dùng số
// này để sắp thứ tự chạy. Tên class BẮT BUỘC phải kết thúc bằng đúng con số đó,
// nếu lệch thì TypeORM báo "Migration class name should have a timestamp".

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieRecommendations1722200000000 implements MigrationInterface {
  name = 'AddMovieRecommendations1722200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
     * Lỗi FK khi tạo bảng.
     * Nếu chạy migration TRƯỚC file SQL V6.3 thì dbo.users / dbo.movies chưa
     * tồn tại, SQL Server ném lỗi 1767 ("Foreign key references invalid table")
     * — thông báo này không nói cho sinh viên biết phải làm gì. Ở đây kiểm tra
     * trước và ném lỗi tiếng Việt chỉ rõ cách khắc phục.
     */
    const [check] = await queryRunner.query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.users',  'U') IS NULL THEN 1 ELSE 0 END AS missing_users,
        CASE WHEN OBJECT_ID('dbo.movies', 'U') IS NULL THEN 1 ELSE 0 END AS missing_movies
    `);

    const missing: string[] = [];
    if (Number(check.missing_users) === 1) missing.push('dbo.users');
    if (Number(check.missing_movies) === 1) missing.push('dbo.movies');

    if (missing.length > 0) {
      throw new Error(
        `Không tạo được bảng movie_recommendations vì thiếu bảng: ${missing.join(', ')}.\n` +
          `Hãy chạy file CineHunt_Database_V6_3_With_Sample_Data.sql trong SSMS trước, ` +
          `rồi mới chạy "npm run migration:run".`,
      );
    }

    // Bọc trong IF OBJECT_ID ... IS NULL để an toàn khi bảng đã được tạo tay
    // từ trước (chạy lại migration không làm hỏng gì).
    await queryRunner.query(`
      IF OBJECT_ID('dbo.movie_recommendations', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.movie_recommendations (
          recommendation_id  INT IDENTITY(1,1) NOT NULL,
          user_id            INT NOT NULL,
          movie_id           INT NOT NULL,
          score              DECIMAL(9,6) NOT NULL
                             CONSTRAINT DF_movie_recommendations_score DEFAULT 0,
          -- Đặt tên rank_order chứ KHÔNG dùng "rank": RANK là từ khoá dành
          -- riêng của T-SQL, dùng làm tên cột sẽ phải escape ở mọi câu query.
          rank_order         INT NOT NULL
                             CONSTRAINT DF_movie_recommendations_rank_order DEFAULT 0,
          algorithm          VARCHAR(30) NOT NULL
                             CONSTRAINT DF_movie_recommendations_algorithm DEFAULT 'HYBRID',
          model_version      VARCHAR(50) NULL,
          generated_at       DATETIME2(0) NOT NULL
                             CONSTRAINT DF_movie_recommendations_generated_at DEFAULT SYSDATETIME(),
          created_at         DATETIME2(0) NOT NULL
                             CONSTRAINT DF_movie_recommendations_created_at DEFAULT SYSDATETIME(),
          updated_at         DATETIME2(0) NOT NULL
                             CONSTRAINT DF_movie_recommendations_updated_at DEFAULT SYSDATETIME(),

          CONSTRAINT PK_movie_recommendations PRIMARY KEY (recommendation_id),

          CONSTRAINT UQ_movie_recommendations_user_movie UNIQUE (user_id, movie_id),

          CONSTRAINT FK_movie_recommendations_user FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id) ON DELETE CASCADE,

          CONSTRAINT FK_movie_recommendations_movie FOREIGN KEY (movie_id)
            REFERENCES dbo.movies(movie_id) ON DELETE CASCADE,

          CONSTRAINT CK_movie_recommendations_score CHECK (score >= 0),
          CONSTRAINT CK_movie_recommendations_rank_order CHECK (rank_order >= 0),
          CONSTRAINT CK_movie_recommendations_algorithm CHECK (
            algorithm IN ('POPULARITY', 'CONTENT', 'SVD', 'NCF', 'HYBRID')
          )
        );
      END
    `);

    // Index phục vụ truy vấn chính: lấy top-N phim gợi ý của 1 user theo thứ hạng.
    await queryRunner.query(`
      IF OBJECT_ID('dbo.movie_recommendations', 'U') IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'IX_movie_recommendations_user_rank'
             AND object_id = OBJECT_ID('dbo.movie_recommendations')
         )
      BEGIN
        CREATE INDEX IX_movie_recommendations_user_rank
          ON dbo.movie_recommendations(user_id, rank_order)
          INCLUDE (movie_id, score);
      END
    `);

    // SQL Server KHÔNG tự tạo index cho cột FK — thiếu index này thì mỗi lần
    // xoá 1 phim sẽ quét toàn bảng để kiểm tra cascade.
    await queryRunner.query(`
      IF OBJECT_ID('dbo.movie_recommendations', 'U') IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM sys.indexes
           WHERE name = 'IX_movie_recommendations_movie'
             AND object_id = OBJECT_ID('dbo.movie_recommendations')
         )
      BEGIN
        CREATE INDEX IX_movie_recommendations_movie
          ON dbo.movie_recommendations(movie_id);
      END
    `);
  }

  /*
   * down() bắt buộc phải viết. Bỏ trống thì "npm run migration:revert" chạy
   * xong không làm gì cả nhưng vẫn xoá dòng khỏi bảng typeorm_migrations —
   * DB và lịch sử migration lệch nhau mà không ai biết.
   * DROP TABLE tự xoá luôn index, FK và constraint của bảng đó nên không cần
   * drop riêng từng cái.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.movie_recommendations', 'U') IS NOT NULL
        DROP TABLE dbo.movie_recommendations;
    `);
  }
}
