import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovieRatingsPreflight1785603000000
  implements MigrationInterface
{
  name = 'MovieRatingsPreflight1785603000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID(N'dbo.movies', N'U') IS NULL
        THROW 52000, N'Bảng dbo.movies chưa tồn tại.', 1;

      IF OBJECT_ID(N'dbo.users', N'U') IS NULL
        THROW 52001, N'Bảng dbo.users chưa tồn tại.', 1;

      IF COL_LENGTH(N'dbo.movies', N'average_rating') IS NULL
      BEGIN
        ALTER TABLE dbo.movies
          ADD average_rating DECIMAL(3,2) NOT NULL
          CONSTRAINT DF_movies_average_rating DEFAULT 0;
      END;

      IF OBJECT_ID(N'dbo.movie_ratings', N'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH(N'dbo.movie_ratings', N'rating_id') IS NULL
          OR COL_LENGTH(N'dbo.movie_ratings', N'movie_id') IS NULL
          OR COL_LENGTH(N'dbo.movie_ratings', N'user_id') IS NULL
          OR COL_LENGTH(N'dbo.movie_ratings', N'stars') IS NULL
        BEGIN
          THROW 52003,
            N'Bảng movie_ratings cũ thiếu cột lõi; cần sao lưu và sửa thủ công.',
            1;
        END;

        IF COL_LENGTH(N'dbo.movie_ratings', N'created_at') IS NULL
        BEGIN
          ALTER TABLE dbo.movie_ratings
            ADD created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_movie_ratings_created_at_preflight
            DEFAULT SYSDATETIME();
        END;

        IF COL_LENGTH(N'dbo.movie_ratings', N'updated_at') IS NULL
        BEGIN
          ALTER TABLE dbo.movie_ratings
            ADD updated_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_movie_ratings_updated_at_preflight
            DEFAULT SYSDATETIME();
        END;
      END;
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'MovieRatingsPreflight không thể tự động revert mà không có nguy cơ mất dữ liệu.',
    );
  }
}
