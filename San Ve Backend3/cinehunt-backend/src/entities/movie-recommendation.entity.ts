// src/entities/movie-recommendation.entity.ts
// Entity map 1-1 với bảng do migration 1722200000000 tạo ra.
// Khai báo tên cột tường minh (name: 'snake_case') giống hệt các entity còn
// lại của project — app.module.ts KHÔNG dùng SnakeNamingStrategy, nên bỏ
// `name` sẽ khiến TypeORM tìm cột "userId" và query lỗi ngay.

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Movie } from './movie.entity';

export enum RecommendationAlgorithm {
  POPULARITY = 'POPULARITY',
  CONTENT = 'CONTENT',
  SVD = 'SVD',
  NCF = 'NCF',
  HYBRID = 'HYBRID',
}

@Entity('movie_recommendations')
@Unique('UQ_movie_recommendations_user_movie', ['userId', 'movieId'])
@Index('IX_movie_recommendations_user_rank', ['userId', 'rankOrder'])
export class MovieRecommendation {
  @PrimaryGeneratedColumn({ type: 'int', name: 'recommendation_id' })
  recommendationId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  /** Điểm dự đoán từ model. DECIMAL nên driver mssql trả về string. */
  @Column({
    name: 'score',
    type: 'decimal',
    precision: 9,
    scale: 6,
    default: 0,
  })
  score: string;

  /** Thứ hạng trong danh sách top-N (0 = cao nhất). */
  @Column({ name: 'rank_order', type: 'int', default: 0 })
  rankOrder: number;

  @Column({
    name: 'algorithm',
    type: 'varchar',
    length: 30,
    default: RecommendationAlgorithm.HYBRID,
  })
  algorithm: RecommendationAlgorithm;

  @Column({ name: 'model_version', type: 'varchar', length: 50, nullable: true })
  modelVersion: string | null;

  @Column({ name: 'generated_at', type: 'datetime2', precision: 0 })
  generatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2', precision: 0 })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Movie, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;
}
