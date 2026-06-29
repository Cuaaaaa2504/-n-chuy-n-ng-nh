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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Movie = exports.MovieStatus = void 0;
const typeorm_1 = require("typeorm");
const genre_entity_1 = require("./genre.entity");
var MovieStatus;
(function (MovieStatus) {
    MovieStatus["COMING_SOON"] = "COMING_SOON";
    MovieStatus["NOW_SHOWING"] = "NOW_SHOWING";
    MovieStatus["ENDED"] = "ENDED";
})(MovieStatus || (exports.MovieStatus = MovieStatus = {}));
let Movie = class Movie {
};
exports.Movie = Movie;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'movie_id', type: 'int' }),
    __metadata("design:type", Number)
], Movie.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title', type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Movie.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_minutes', type: 'int' }),
    __metadata("design:type", Number)
], Movie.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'age_rating', type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "ageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'release_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "releaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'poster_url', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "posterUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Movie.prototype, "trailerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, default: MovieStatus.NOW_SHOWING }),
    __metadata("design:type", String)
], Movie.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], Movie.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], Movie.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => genre_entity_1.Genre, (genre) => genre.movies, { eager: true }),
    (0, typeorm_1.JoinTable)({
        name: 'movie_genres',
        joinColumn: {
            name: 'movie_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'genre_id',
            referencedColumnName: 'id',
        },
    }),
    __metadata("design:type", Array)
], Movie.prototype, "genres", void 0);
exports.Movie = Movie = __decorate([
    (0, typeorm_1.Entity)('movies')
], Movie);
//# sourceMappingURL=movie.entity.js.map