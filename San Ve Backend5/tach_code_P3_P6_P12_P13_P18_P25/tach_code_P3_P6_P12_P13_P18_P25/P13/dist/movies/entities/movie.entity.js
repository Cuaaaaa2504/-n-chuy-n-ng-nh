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
var MovieStatus;
(function (MovieStatus) {
    MovieStatus["NOW_SHOWING"] = "NOW_SHOWING";
    MovieStatus["COMING_SOON"] = "COMING_SOON";
    MovieStatus["ENDED"] = "ENDED";
})(MovieStatus || (exports.MovieStatus = MovieStatus = {}));
let Movie = class Movie {
};
exports.Movie = Movie;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'id' }),
    __metadata("design:type", Number)
], Movie.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title', type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], Movie.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Movie.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'genre', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Movie.prototype, "genre", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration', type: 'int' }),
    __metadata("design:type", Number)
], Movie.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'age_rating', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Movie.prototype, "ageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'poster_url', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Movie.prototype, "posterUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trailer_url', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Movie.prototype, "trailerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'release_date', type: 'date' }),
    __metadata("design:type", Date)
], Movie.prototype, "releaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'status',
        type: 'simple-enum',
        enum: MovieStatus,
        default: MovieStatus.COMING_SOON,
    }),
    __metadata("design:type", String)
], Movie.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Movie.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Movie.prototype, "updatedAt", void 0);
exports.Movie = Movie = __decorate([
    (0, typeorm_1.Entity)('movies')
], Movie);
//# sourceMappingURL=movie.entity.js.map