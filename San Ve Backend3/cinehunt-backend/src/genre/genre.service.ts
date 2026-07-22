import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from '../entities/genre.entity';

@Injectable()
export class GenreService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepo: Repository<Genre>,
  ) {}

  findAll(): Promise<Genre[]> {
    return this.genreRepo.find({ order: { genreName: 'ASC' } });
  }
}
