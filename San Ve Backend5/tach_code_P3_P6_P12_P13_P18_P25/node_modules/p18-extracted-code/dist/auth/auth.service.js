"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
let AuthService = class AuthService {
    constructor(userRepository, jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }
    async register(dto) {
        var _a;
        const normalizedEmail = dto.email.trim().toLowerCase();
        const existedUser = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });
        if (existedUser) {
            throw new common_1.BadRequestException('Email đã được sử dụng');
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);
        const user = this.userRepository.create({
            fullName: dto.fullName.trim(),
            email: normalizedEmail,
            phone: ((_a = dto.phone) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            passwordHash,
            role: user_entity_1.UserRole.CUSTOMER,
            status: user_entity_1.UserStatus.ACTIVE,
            emailVerified: false,
        });
        const savedUser = await this.userRepository.save(user);
        return {
            message: 'Đăng ký tài khoản thành công',
            user: this.toSafeUser(savedUser),
        };
    }
    async login(dto) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const user = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        if (user.status !== user_entity_1.UserStatus.ACTIVE) {
            throw new common_1.UnauthorizedException('Tài khoản đã bị khóa hoặc xóa');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
        const accessToken = await this.generateAccessToken(user);
        return {
            message: 'Đăng nhập thành công',
            accessToken,
            tokenType: 'Bearer',
            user: this.toSafeUser(user),
        };
    }
    async getProfile(userId) {
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('Không tìm thấy người dùng');
        }
        return this.toSafeUser(user);
    }
    async generateAccessToken(user) {
        const payload = {
            sub: user.userId,
            email: user.email,
            role: user.role,
        };
        return this.jwtService.signAsync(payload);
    }
    toSafeUser(user) {
        return {
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            role: user.role,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map