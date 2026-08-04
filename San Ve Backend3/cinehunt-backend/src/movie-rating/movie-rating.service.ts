import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MovieRatingSummary {
  movieId: number;
  averageStars: number;
  averageScore: number;
  ratingCount: number;
  myRating: number | null;
}

type RatingRow = Record<string, unknown>;

@Injectable()
export class MovieRatingService {
  constructor(private readonly dataSource: DataSource) {}

  private async ensureMovieExists(movieId: number): Promise<void> {
    const rows = (await this.dataSource.query(
      'SELECT TOP 1 movie_id FROM dbo.movies WHERE movie_id = @0',
      [movieId],
    )) as RatingRow[];

    if (!rows.length) {
      throw new NotFoundException('Không tìm thấy phim');
    }
  }

  private normalizeRow(row: RatingRow | undefined, movieId: number): MovieRatingSummary {
    const averageStars = Number(row?.average_stars ?? row?.averageStars ?? 0);
    const averageScore = Number(row?.average_score ?? row?.averageScore ?? averageStars * 2);
    const ratingCount = Number(row?.rating_count ?? row?.ratingCount ?? 0);
    const rawMyRating = row?.my_rating ?? row?.myRating;
    const myRating = rawMyRating === null || rawMyRating === undefined
      ? null
      : Number(rawMyRating);

    return {
      movieId: Number(row?.movie_id ?? row?.movieId ?? movieId),
      averageStars: Number.isFinite(averageStars) ? averageStars : 0,
      averageScore: Number.isFinite(averageScore) ? averageScore : 0,
      ratingCount: Number.isFinite(ratingCount) ? ratingCount : 0,
      myRating: Number.isFinite(myRating as number) ? myRating : null,
    };
  }

  async getSummary(movieId: number, userId: number | null = null): Promise<MovieRatingSummary> {
    await this.ensureMovieExists(movieId);

    const rows = (await this.dataSource.query(
      'EXEC dbo.sp_get_movie_rating @movie_id = @0, @user_id = @1',
      [movieId, userId],
    )) as RatingRow[];

    return this.normalizeRow(rows[0], movieId);
  }

  async rateMovie(movieId: number, userId: number, stars: number): Promise<MovieRatingSummary> {
    await this.ensureMovieExists(movieId);

    const rows = (await this.dataSource.query(
      'EXEC dbo.sp_upsert_movie_rating @movie_id = @0, @user_id = @1, @stars = @2',
      [movieId, userId, stars],
    )) as RatingRow[];

    return rows.length
      ? this.normalizeRow(rows[0], movieId)
      : this.getSummary(movieId, userId);
  }


  async getTopRated(limit = 3): Promise<MovieRatingSummary[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);

    const rows = (await this.dataSource.query(`
      SELECT TOP (${safeLimit})
        m.movie_id,
        CAST(
          COALESCE(AVG(CAST(mr.stars AS DECIMAL(10,4))), 0)
          AS DECIMAL(3,2)
        ) AS average_stars,
        CAST(
          COALESCE(AVG(CAST(mr.stars AS DECIMAL(10,4))), 0) * 2
          AS DECIMAL(4,2)
        ) AS average_score,
        COUNT(mr.rating_id) AS rating_count,
        NULL AS my_rating
      FROM dbo.movies AS m
      LEFT JOIN dbo.movie_ratings AS mr
        ON mr.movie_id = m.movie_id
      WHERE m.status = 'NOW_SHOWING'
      GROUP BY m.movie_id
      ORDER BY
        CASE WHEN COUNT(mr.rating_id) = 0 THEN 1 ELSE 0 END ASC,
        AVG(CAST(mr.stars AS DECIMAL(10,4))) DESC,
        COUNT(mr.rating_id) DESC,
        m.movie_id ASC;
    `)) as RatingRow[];

    return rows.map((row) =>
      this.normalizeRow(row, Number(row.movie_id ?? row.movieId ?? 0)),
    );
  }

  async removeRating(movieId: number, userId: number): Promise<MovieRatingSummary> {
    await this.ensureMovieExists(movieId);

    const rows = (await this.dataSource.query(
      'EXEC dbo.sp_delete_movie_rating @movie_id = @0, @user_id = @1',
      [movieId, userId],
    )) as RatingRow[];

    return rows.length
      ? this.normalizeRow(rows[0], movieId)
      : this.getSummary(movieId, userId);
  }
}
