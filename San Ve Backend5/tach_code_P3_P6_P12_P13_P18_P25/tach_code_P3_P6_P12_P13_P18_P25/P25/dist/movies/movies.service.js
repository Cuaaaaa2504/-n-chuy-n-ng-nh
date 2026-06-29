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
const genre_entity_1 = require("./entities/genre.entity");
let MoviesService = class MoviesService {
    constructor(movieRepo, genreRepo) {
        this.movieRepo = movieRepo;
        this.genreRepo = genreRepo;
    }
    async findAll(query) {
        var _a, _b;
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 10;
        const skip = (page - 1) * limit;
        const qb = this.movieRepo
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.genres', 'genre')
            .orderBy('movie.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (query.search) {
            qb.andWhere('movie.title LIKE :search', {
                search: `%${query.search}%`,
            });
        }
        if (query.genre) {
            qb.andWhere('genre.name LIKE :genre', {
                genre: `%${query.genre}%`,
            });
        }
        if (query.status) {
            qb.andWhere('movie.status = :status', {
                status: query.status,
            });
        }
        const [items, total] = await qb.getManyAndCount();
        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            items,
        };
    }
    async findOne(id) {
        const movie = await this.movieRepo.findOne({
            where: { id },
            relations: ['genres'],
        });
        if (!movie) {
            throw new common_1.NotFoundException('Không tìm thấy phim');
        }
        return movie;
    }
    async create(dto) {
        var _a, _b, _c, _d, _e;
        const genres = await this.resolveGenres(dto.genreIds);
        const movie = this.movieRepo.create({
            title: dto.title,
            description: (_a = dto.description) !== null && _a !== void 0 ? _a : null,
            durationMinutes: dto.durationMinutes,
            ageRating: (_b = dto.ageRating) !== null && _b !== void 0 ? _b : null,
            releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
            posterUrl: (_c = dto.posterUrl) !== null && _c !== void 0 ? _c : null,
            trailerUrl: (_d = dto.trailerUrl) !== null && _d !== void 0 ? _d : null,
            status: (_e = dto.status) !== null && _e !== void 0 ? _e : movie_entity_1.MovieStatus.NOW_SHOWING,
            genres,
        });
        return this.movieRepo.save(movie);
    }
    async update(id, dto) {
        const movie = await this.findOne(id);
        if (dto.title !== undefined)
            movie.title = dto.title;
        if (dto.description !== undefined)
            movie.description = dto.description;
        if (dto.durationMinutes !== undefined)
            movie.durationMinutes = dto.durationMinutes;
        if (dto.ageRating !== undefined)
            movie.ageRating = dto.ageRating;
        if (dto.releaseDate !== undefined) {
            movie.releaseDate = dto.releaseDate ? new Date(dto.releaseDate) : null;
        }
        if (dto.posterUrl !== undefined)
            movie.posterUrl = dto.posterUrl;
        if (dto.trailerUrl !== undefined)
            movie.trailerUrl = dto.trailerUrl;
        if (dto.status !== undefined)
            movie.status = dto.status;
        if (dto.genreIds !== undefined) {
            movie.genres = await this.resolveGenres(dto.genreIds);
        }
        return this.movieRepo.save(movie);
    }
    async remove(id) {
        const movie = await this.findOne(id);
        movie.status = movie_entity_1.MovieStatus.ENDED;
        await this.movieRepo.save(movie);
        return {
            message: 'Đã xóa phim khỏi danh sách đang hoạt động',
            movieId: id,
            status: movie_entity_1.MovieStatus.ENDED,
        };
    }
    async resolveGenres(genreIds) {
        if (!genreIds || genreIds.length === 0) {
            return [];
        }
        const uniqueGenreIds = [...new Set(genreIds)];
        const genres = await this.genreRepo.find({
            where: { id: (0, typeorm_2.In)(uniqueGenreIds) },
        });
        if (genres.length !== uniqueGenreIds.length) {
            throw new common_1.BadRequestException('Một hoặc nhiều thể loại không tồn tại');
        }
        return genres;
    }
};
exports.MoviesService = MoviesService;
exports.MoviesService = MoviesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(movie_entity_1.Movie)),
    __param(1, (0, typeorm_1.InjectRepository)(genre_entity_1.Genre)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MoviesService);
//# sourceMappingURL=movies.service.js.map