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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("./public.decorator");
class RegisterDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
let AuthController = class AuthController {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.users = new Map();
    }
    register(dto) {
        if (this.users.has(dto.email)) {
            return { error: 'Email already registered' };
        }
        const id = crypto.randomUUID();
        this.users.set(dto.email, { id, email: dto.email, password: dto.password });
        return { message: 'Registration successful' };
    }
    login(dto) {
        const user = this.users.get(dto.email);
        if (!user || user.password !== dto.password) {
            return { error: 'Invalid credentials' };
        }
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return { access_token: token, recruiter_id: user.id };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map