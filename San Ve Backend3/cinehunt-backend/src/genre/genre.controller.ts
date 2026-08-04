import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GenreService } from './genre.service';

@ApiTags('genres')
@Controller('genres')
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @Get()
  findAll() {
    return this.genreService.findAll();
  }
}
