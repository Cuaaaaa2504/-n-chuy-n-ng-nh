// src/migrations/1722300000000-ReconcileMovieRecommendations.ts
//
// FIX [#3] — Schema lệch giữa CineHunt_Patch_V6_4_Recommendation.sql và
// migration 1722200000000.
//
// QUYẾT ĐỊNH: migration TypeScript là NGUỒN SỰ THẬT DUY NHẤT.
// File CineHunt_Patch_V6_4_Recommendation.sql đã bị xoá khỏi repo.
// Lý do chọn migration TS thay vì file SQL:
//   - src/entities/movie-recommendation.entity.ts đang map đúng theo migration
//     (rank_order, algorithm, PK INT). Nếu chọn file SQL làm chuẩn thì phải
//     sửa lại entity + mọi query.
//   - Migration có lịch sử trong bảng typeorm_migrations, chạy lại không hỏng,
//     revert được. File SQL chạy tay không để lại dấu vết gì.
//
// Migration này dọn hậu quả cho những máy ĐÃ chạy file SQL patch trước đó:
// bảng ở các máy đó có PK BIGINT, cột rank_position, có expires_at, thiếu
// algorithm/generated_at/updated_at => entity query vào sẽ lỗi ngay.
//
// Cách xử lý: DROP rồi tạo lại theo đúng chuẩn.
// An toàn vì movie_recommendations chỉ là BẢNG CACHE gợi ý — dữ liệu trong đó
// do train.py sinh ra và có thể chạy lại bất cứ lúc nào. Không có dữ liệu
// nghiệp vụ nào của người dùng nằm ở đây.
//
// Migration KHÔNG đụng gì nếu bảng đã đúng chuẩn (idempotent).

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileMovieRecommendations1722300000000
  implements MigrationInterface
{
  name = 'ReconcileMovieRecommendations1722300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dấu hiệu nhận biết bảng được tạo bởi file SQL patch cũ: có cột
    // rank_position (bản chuẩn dùng rank_order).
    const [legacy] = await queryRunner.query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.movie_recommendations', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.movie_recommendations', 'rank_position') IS NOT NULL
             THEN 1 ELSE 0 END AS is_legacy
    `);

    if (Number(legacy.is_legacy) !== 1) {
      // Bảng chưa tồn tại, hoặc đã đúng chuẩn -> không làm gì.
      return;
    }

    // Xoá bảng cũ. DROP TABLE tự xoá kèm index, FK, constraint và default.
    await queryRunner.query(`
      DROP TABLE dbo.movie_recommendations;
    `);

    // Tạo lại y hệt migration 1722200000000 (bản chuẩn).
    await queryRunner.query(`
      CREATE TABLE dbo.movie_recommendations (
        recommendation_id  INT IDENTITY(1,1) NOT NULL,
        user_id            INT NOT NULL,
        movie_id           INT NOT NULL,
        score              DECIMAL(9,6) NOT NULL
                           CONSTRAINT DF_movie_recommendations_score DEFAULT 0,
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
    `);

    await queryRunner.query(`
      CREATE INDEX IX_movie_recommendations_user_rank
        ON dbo.movie_recommendations(user_id, rank_order)
        INCLUDE (movie_id, score);
    `);

    await queryRunner.query(`
      CREATE INDEX IX_movie_recommendations_movie
        ON dbo.movie_recommendations(movie_id);
    `);
  }

  /**
   * Không thể (và không nên) khôi phục lại schema cũ của file SQL patch — đó
   * chính là schema sai mà migration này sinh ra để loại bỏ. Revert migration
   * 1722200000000 mới là thứ xoá hẳn bảng.
   *
   * down() để trống CÓ CHỦ ĐÍCH, không phải quên viết.
   */
  public async down(): Promise<void> {
    return;
  }
}
