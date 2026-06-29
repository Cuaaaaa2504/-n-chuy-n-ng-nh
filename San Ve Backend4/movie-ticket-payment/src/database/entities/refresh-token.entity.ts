// src/database/entities/refresh-token.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  refresh_token_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 255 })
  token_hash: string;

  @Column({ type: 'datetime' })
  expired_at: Date;

  @Column({ type: 'datetime', nullable: true })
  revoked_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}