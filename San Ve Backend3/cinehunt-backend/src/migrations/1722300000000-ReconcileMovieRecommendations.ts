// migration 1722200000000

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileMovieRecommendations1722300000000
  implements MigrationInterface
{
  name = 'ReconcileMovieRecommendations1722300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [legacy] = await queryRunner.query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.movie_recommendations', 'U') IS NOT NULL
              AND COL_LENGTH('dbo.movie_recommendations', 'rank_position') IS NOT NULL
             THEN 1 ELSE 0 END AS is_legacy
    `);

    if (Number(legacy.is_legacy) !== 1) {
      return;
    }

    await queryRunner.query(`
      DROP TABLE dbo.movie_recommendations;
    `);

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

  public async down(): Promise<void> {
    return;
  }
}
