import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairMovieRatingConstraints1785604500000
  implements MigrationInterface
{
  name = 'RepairMovieRatingConstraints1785604500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID(N'dbo.movie_ratings', N'U') IS NULL
        THROW 52020, N'Bảng dbo.movie_ratings chưa tồn tại.', 1;

      IF EXISTS (
        SELECT movie_id, user_id
        FROM dbo.movie_ratings
        GROUP BY movie_id, user_id
        HAVING COUNT(*) > 1
      )
        THROW 52021, N'movie_ratings có dữ liệu trùng movie_id/user_id.', 1;

      IF EXISTS (SELECT 1 FROM dbo.movie_ratings WHERE stars NOT BETWEEN 1 AND 5)
        THROW 52022, N'movie_ratings có số sao ngoài khoảng 1..5.', 1;

      IF EXISTS (
        SELECT 1
        FROM dbo.movie_ratings r
        LEFT JOIN dbo.movies m ON m.movie_id = r.movie_id
        WHERE m.movie_id IS NULL
      )
        THROW 52023, N'movie_ratings có movie_id mồ côi.', 1;

      IF EXISTS (
        SELECT 1
        FROM dbo.movie_ratings r
        LEFT JOIN dbo.users u ON u.user_id = r.user_id
        WHERE u.user_id IS NULL
      )
        THROW 52024, N'movie_ratings có user_id mồ côi.', 1;

      IF NOT EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.movie_ratings')
          AND type = 'PK'
      )
      BEGIN
        ALTER TABLE dbo.movie_ratings
          ADD CONSTRAINT PK_movie_ratings PRIMARY KEY (rating_id);
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.movie_ratings')
          AND is_unique = 1
          AND name = N'UQ_movie_ratings_movie_user'
      )
      BEGIN
        CREATE UNIQUE INDEX UQ_movie_ratings_movie_user
          ON dbo.movie_ratings(movie_id, user_id);
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.movie_ratings')
          AND name = N'CK_movie_ratings_stars'
      )
      BEGIN
        ALTER TABLE dbo.movie_ratings WITH CHECK
          ADD CONSTRAINT CK_movie_ratings_stars
          CHECK (stars BETWEEN 1 AND 5);
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID(N'dbo.movie_ratings')
          AND name = N'FK_movie_ratings_movie'
      )
      BEGIN
        ALTER TABLE dbo.movie_ratings WITH CHECK
          ADD CONSTRAINT FK_movie_ratings_movie
          FOREIGN KEY (movie_id) REFERENCES dbo.movies(movie_id)
          ON DELETE CASCADE;
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID(N'dbo.movie_ratings')
          AND name = N'FK_movie_ratings_user'
      )
      BEGIN
        ALTER TABLE dbo.movie_ratings WITH CHECK
          ADD CONSTRAINT FK_movie_ratings_user
          FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
          ON DELETE CASCADE;
      END;
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'RepairMovieRatingConstraints không thể tự động revert an toàn.',
    );
  }
}
