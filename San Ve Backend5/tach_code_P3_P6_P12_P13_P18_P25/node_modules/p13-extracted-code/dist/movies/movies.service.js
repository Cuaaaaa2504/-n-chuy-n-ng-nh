"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoviesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const movie_entity_1 = require("./entities/movie.entity");
let MoviesService = class MoviesService {
    constructor(movieRepository) {
        this.movieRepository = movieRepository;
    }
    async findAll(query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.keyword) {
            where.title = (0, typeorm_2.Like)(`%${query.keyword}%`);
        }
        if (query.genre) {
            where.genre = (0, typeorm_2.Like)(`%${query.genre}%`);
        }
        if (query.status) {
            where.status = query.status;
        }
        const [data, total] = await this.movieRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: {
                releaseDate: 'DESC',
                createdAt: 'DESC',
            },
        });
        return {
            message: 'Lấy danh sách phim thành công',
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const movie = await this.movieRepository.findOne({
            where: { id },
        });
        if (!movie) {
            throw new common_1.NotFoundException('Không tìm thấy phim');
        }
        return {
            message: 'Lấy chi tiết phim thành công',
            data: movie,
        };
    }
    async create(createMovieDto) {
        const movie = this.movieRepository.create(Object.assign(Object.assign({}, createMovieDto), { releaseDate: new Date(createMovieDto.releaseDate) }));
        const savedMovie = await this.movieRepository.save(movie);
        return {
            message: 'Thêm phim thành công',
            data: savedMovie,
        };
    }
    async update(id, updateMovieDto) {
        const movie = await this.movieRepository.findOne({
            where: { id },
        });
        if (!movie) {
            throw new common_1.NotFoundException('Không tìm thấy phim để cập nhật');
        }
        Object.assign(movie, Object.assign(Object.assign({}, updateMovieDto), { releaseDate: updateMovieDto.releaseDate
                ? new Date(updateMovieDto.releaseDate)
                : movie.releaseDate }));
        const updatedMovie = await this.movieRepository.save(movie);
        return {
            message: 'Cập nhật phim thành công',
            data: updatedMovie,
        };
    }
    async remove(id) {
        const movie = await this.movieRepository.findOne({
            where: { id },
        });
        if (!movie) {
            throw new common_1.NotFoundException('Không tìm thấy phim để xóa');
        }
        await this.movieRepository.remove(movie);
        return {
            message: 'Xóa phim thành công',
        };
    }
};
exports.MoviesService = MoviesService;
exports.MoviesService = MoviesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(movie_entity_1.Movie)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MoviesService);
//# sourceMappingURL=movies.service.js.map