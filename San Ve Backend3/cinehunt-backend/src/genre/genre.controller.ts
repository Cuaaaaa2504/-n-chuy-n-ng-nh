import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GenreService } from './genre.service';

/**
 * FIX: bảng `genres` đã có dữ liệu và `CreateMovieDto` yêu cầu `genreIds: number[]`,
 * nhưng trước đây KHÔNG có endpoint nào để frontend lấy danh sách thể loại kèm ID.
 * Hệ quả: form thêm/sửa phim chỉ có thể nhập tên thể loại dạng text tự do rồi gửi
 * lên -> luôn bị ValidationPipe từ chối (400).
 *
 * Chỉ đọc và không chứa dữ liệu nhạy cảm nên để public như GET /movies.
 */
@ApiTags('genres')
@Controller('genres')
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @Get()
  findAll() {
    return this.genreService.findAll();
  }
}
