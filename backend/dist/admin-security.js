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
exports.AdminMfaController = exports.AdminMfaMiddleware = void 0;
exports.totp = totp;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const db = new client_1.PrismaClient();
function key() { const raw = process.env.ADMIN_MFA_ENCRYPTION_KEY; if (!raw || !/^[0-9a-f]{64}$/i.test(raw))
    throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be 64 hex chars'); return Buffer.from(raw, 'hex'); }
function encrypt(secret) { const iv = (0, node_crypto_1.randomBytes)(12), cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key(), iv); const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]); return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join(':'); }
function decrypt(value) { const [iv, tag, data] = value.split(':'); const cipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key(), Buffer.from(iv, 'hex')); cipher.setAuthTag(Buffer.from(tag, 'hex')); return Buffer.concat([cipher.update(Buffer.from(data, 'hex')), cipher.final()]).toString('utf8'); }
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) { let bits = 0, value = 0, out = ''; for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
        out += alphabet[(value >>> (bits -= 5)) & 31];
    }
} if (bits > 0)
    out += alphabet[(value << (5 - bits)) & 31]; return out; }
function decode32(value) { let bits = 0, acc = 0, out = []; for (const c of value) {
    const v = alphabet.indexOf(c);
    if (v < 0)
        throw new Error('Invalid base32');
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) {
        out.push((acc >>> (bits -= 8)) & 255);
    }
} return Buffer.from(out); }
function totp(secret, step) { const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const hash = (0, node_crypto_1.createHmac)('sha1', decode32(secret)).update(counter).digest(); const offset = hash[19] & 15; return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0'); }
function validStep(secret, code, lastUsed) { if (!/^\d{6}$/.test(code))
    return null; const now = Math.floor(Date.now() / 30000); for (const step of [now - 1, now, now + 1]) {
    if (BigInt(step) <= lastUsed)
        continue;
    const expected = Buffer.from(totp(secret, step));
    if ((0, node_crypto_1.timingSafeEqual)(expected, Buffer.from(code)))
        return BigInt(step);
} return null; }
async function adminUser(jwt, header) { if (!header?.startsWith('Bearer '))
    throw new common_1.UnauthorizedException(); let sub; try {
    sub = (await jwt.verifyAsync(header.slice(7))).sub;
}
catch {
    throw new common_1.UnauthorizedException();
} const user = await db.user.findUnique({ where: { id: sub } }); if (!user || user.suspendedAt)
    throw new common_1.UnauthorizedException(); const role = await db.adminRole.findFirst({ where: { userId: sub } }); if (!role)
    throw new common_1.ForbiddenException('Admin role required'); return user; }
let AdminMfaMiddleware = class AdminMfaMiddleware {
    constructor(jwt) {
        this.jwt = jwt;
    }
    async use(req, res, next) {
        try {
            const user = await adminUser(this.jwt, req.headers.authorization);
            const mfa = await db.adminMfa.findUnique({ where: { userId: user.id } });
            if (!mfa?.enabled)
                throw new common_1.ForbiddenException('Administrator MFA enrollment required');
            const code = req.headers['x-admin-totp'];
            if (typeof code !== 'string')
                throw new common_1.UnauthorizedException('TOTP required');
            const step = validStep(decrypt(mfa.encryptedSecret), code, mfa.lastUsedStep);
            if (step === null)
                throw new common_1.UnauthorizedException('Invalid or reused TOTP');
            const changed = await db.adminMfa.updateMany({ where: { userId: user.id, lastUsedStep: { lt: step } }, data: { lastUsedStep: step } });
            if (changed.count !== 1)
                throw new common_1.UnauthorizedException('TOTP replay detected');
            next();
        }
        catch (e) {
            res.status(e?.getStatus?.() ?? 500).json({ message: e?.message ?? 'MFA verification failed' });
        }
    }
};
exports.AdminMfaMiddleware = AdminMfaMiddleware;
exports.AdminMfaMiddleware = AdminMfaMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AdminMfaMiddleware);
let AdminMfaController = class AdminMfaController {
    constructor(jwt) {
        this.jwt = jwt;
    }
    async enroll(authorization) { const user = await adminUser(this.jwt, authorization); const current = await db.adminMfa.findUnique({ where: { userId: user.id } }); if (current?.enabled)
        throw new common_1.ForbiddenException('Already enabled'); const secret = base32((0, node_crypto_1.randomBytes)(20)); await db.adminMfa.upsert({ where: { userId: user.id }, create: { userId: user.id, encryptedSecret: encrypt(secret) }, update: { encryptedSecret: encrypt(secret), lastUsedStep: -1 } }); return { secret, otpauthUrl: `otpauth://totp/BORU:${encodeURIComponent(user.email)}?secret=${secret}&issuer=BORU&digits=6&period=30` }; }
    async confirm(authorization, body) { const user = await adminUser(this.jwt, authorization); const row = await db.adminMfa.findUnique({ where: { userId: user.id } }); if (!row || row.enabled)
        throw new common_1.BadRequestException('Enrollment not pending'); const step = validStep(decrypt(row.encryptedSecret), body?.code ?? '', row.lastUsedStep); if (step === null)
        throw new common_1.UnauthorizedException('Invalid TOTP'); await db.adminMfa.update({ where: { userId: user.id }, data: { enabled: true, lastUsedStep: step } }); await db.adminAudit.create({ data: { actorId: user.id, action: 'MFA_ENABLED' } }); return { enabled: true }; }
    async status(authorization) { const user = await adminUser(this.jwt, authorization); const row = await db.adminMfa.findUnique({ where: { userId: user.id }, select: { enabled: true } }); return { enabled: row?.enabled ?? false }; }
};
exports.AdminMfaController = AdminMfaController;
__decorate([
    (0, common_1.Post)('enroll'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminMfaController.prototype, "enroll", null);
__decorate([
    (0, common_1.Post)('confirm'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminMfaController.prototype, "confirm", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminMfaController.prototype, "status", null);
exports.AdminMfaController = AdminMfaController = __decorate([
    (0, common_1.Controller)('admin-security/mfa'),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AdminMfaController);
//# sourceMappingURL=admin-security.js.map