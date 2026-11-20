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
exports.AppModule = void 0;
const admin_security_1 = require("./admin-security");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
const class_validator_1 = require("class-validator");
const bcrypt = __importStar(require("bcryptjs"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
class RegisterDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], RegisterDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2),
    __metadata("design:type", String)
], RegisterDto.prototype, "countryCode", void 0);
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
class MessageDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MessageDto.prototype, "content", void 0);
class RoomDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], RoomDto.prototype, "title", void 0);
let Db = class Db extends client_1.PrismaClient {
};
Db = __decorate([
    (0, common_1.Injectable)()
], Db);
let Auth = class Auth {
    constructor(db, jwt) {
        this.db = db;
        this.jwt = jwt;
    }
    async register(dto) {
        if (!/^[A-Z]{2}$/.test(dto.countryCode))
            throw new common_1.BadRequestException('Invalid country code');
        const email = dto.email.trim().toLowerCase();
        if (await this.db.user.findUnique({ where: { email } }))
            throw new common_1.ConflictException('Email already registered');
        const user = await this.db.user.create({ data: { email, countryCode: dto.countryCode, displayName: dto.displayName, passwordHash: await bcrypt.hash(dto.password, 12) } });
        return { id: user.id, publicId: user.publicId, displayName: user.displayName };
    }
    async login(dto) {
        const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
        if (!user || !await bcrypt.compare(dto.password, user.passwordHash))
            throw new common_1.UnauthorizedException('Invalid credentials');
        return { accessToken: await this.jwt.signAsync({ sub: user.id }), tokenType: 'Bearer' };
    }
    async user(auth) {
        if (!auth?.startsWith('Bearer '))
            throw new common_1.UnauthorizedException();
        try {
            const token = await this.jwt.verifyAsync(auth.slice(7));
            const user = await this.db.user.findUnique({ where: { id: token.sub }, select: { id: true, publicId: true, email: true, displayName: true, avatarUrl: true } });
            if (!user)
                throw new common_1.UnauthorizedException();
            const status = await this.db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
            if (status?.suspendedAt)
                throw new common_1.ForbiddenException('Account suspended');
            return user;
        }
        catch {
            throw new common_1.UnauthorizedException();
        }
    }
};
Auth = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Db, jwt_1.JwtService])
], Auth);
let RoomEvents = class RoomEvents {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }
    async handleConnection(socket) {
        try {
            const bearer = socket.handshake.auth?.token;
            const user = await this.auth.user(typeof bearer === 'string' ? `Bearer ${bearer}` : undefined);
            socket.data.userId = user.id;
        }
        catch {
            socket.disconnect(true);
        }
    }
    async join(socket, data) {
        const userId = socket.data.userId;
        if (typeof data?.roomId !== 'string' || !userId)
            return { ok: false };
        const room = await this.db.room.findUnique({ where: { id: data.roomId } });
        const banned = await this.db.roomBan.findUnique({ where: { roomId_userId: { roomId: data.roomId, userId } } });
        if (!room || banned || (room.isPrivate && room.ownerId !== userId))
            return { ok: false };
        await socket.join(`room:${room.id}`);
        this.server.to(`room:${room.id}`).emit('presence:changed', { userId, joined: true });
        return { ok: true };
    }
    async leave(socket, data) {
        if (typeof data?.roomId === 'string')
            await socket.leave(`room:${data.roomId}`);
        return { ok: true };
    }
    emitRoom(roomId, event, payload) { this.server?.to(`room:${roomId}`).emit(event, payload); }
    kick(roomId, userId) { this.server?.in(`room:${roomId}`).fetchSockets().then(sockets => { for (const s of sockets) {
        if (s.data.userId === userId) {
            s.emit('room:kicked', { roomId });
            s.leave(`room:${roomId}`);
        }
    } }).catch(() => { }); }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RoomEvents.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RoomEvents.prototype, "join", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RoomEvents.prototype, "leave", null);
RoomEvents = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/rooms', cors: { origin: process.env.CORS_ORIGIN?.split(',') || false } }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Auth, Db])
], RoomEvents);
function livekitClient() { const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET; if (!url || !key || !secret)
    throw new common_1.ServiceUnavailableException('LiveKit not configured'); return new livekit_server_sdk_1.RoomServiceClient(url.replace(/^ws/, 'http'), key, secret); }
let Api = class Api {
    constructor(auth, db, events) {
        this.auth = auth;
        this.db = db;
        this.events = events;
    }
    health() { return { status: 'ok' }; }
    register(body) { return this.auth.register(body); }
    login(body) { return this.auth.login(body); }
    me(auth) { return this.auth.user(auth); }
    rooms() { return this.db.room.findMany({ select: { id: true, title: true, isPrivate: true, createdAt: true }, where: { isPrivate: false }, orderBy: { createdAt: 'desc' }, take: 50 }); }
    async roomAccess(roomId, auth) {
        const user = await this.auth.user(auth);
        const room = await this.db.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (await this.db.roomBan.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } }))
            throw new common_1.ForbiddenException('Banned from room');
        if (room.isPrivate && room.ownerId !== user.id)
            throw new common_1.ForbiddenException('Private room');
        return { user, room };
    }
    async seats(id, auth) {
        await this.roomAccess(id, auth);
        return this.db.roomSeat.findMany({ where: { roomId: id }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { seatNumber: 'asc' } });
    }
    async takeSeat(id, number, auth) {
        const { user } = await this.roomAccess(id, auth);
        if (number < 1 || number > 8)
            throw new common_1.BadRequestException('Seat must be 1-8');
        // Serializes competing seat claims within PostgreSQL transaction.
        const result = await this.db.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${id}))`;
            const existing = await tx.roomSeat.findFirst({ where: { roomId: id, userId: user.id } });
            if (existing && existing.seatNumber !== number)
                await tx.roomSeat.update({ where: { id: existing.id }, data: { userId: null } });
            const seat = await tx.roomSeat.findUnique({ where: { roomId_seatNumber: { roomId: id, seatNumber: number } } });
            if (seat?.userId && seat.userId !== user.id)
                throw new common_1.ConflictException('Seat occupied');
            return tx.roomSeat.upsert({ where: { roomId_seatNumber: { roomId: id, seatNumber: number } }, create: { roomId: id, seatNumber: number, userId: user.id }, update: { userId: user.id } });
        });
        try {
            await livekitClient().updateParticipant(`boru_${id}`, user.id, undefined, { canPublish: true, canSubscribe: true, canPublishData: true });
        }
        catch (e) { /* user may not be connected yet; token refresh needed */ }
        this.events.emitRoom(id, 'seats:changed', { roomId: id });
        return result;
    }
    async releaseSeat(id, number, auth) {
        const { user, room } = await this.roomAccess(id, auth);
        const seat = await this.db.roomSeat.findUnique({ where: { roomId_seatNumber: { roomId: id, seatNumber: number } } });
        if (!seat)
            throw new common_1.NotFoundException('Seat not found');
        if (seat.userId !== user.id && room.ownerId !== user.id)
            throw new common_1.ForbiddenException();
        await this.db.roomSeat.update({ where: { id: seat.id }, data: { userId: null } });
        if (seat.userId) {
            try {
                await livekitClient().updateParticipant(`boru_${id}`, seat.userId, undefined, { canPublish: false, canSubscribe: true, canPublishData: true });
            }
            catch (e) { /* participant may be offline */ }
        }
        this.events.emitRoom(id, 'seats:changed', { roomId: id });
        return { ok: true };
    }
    async messages(id, auth) {
        await this.roomAccess(id, auth);
        return this.db.roomMessage.findMany({ where: { roomId: id }, include: { sender: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }).then(rows => rows.reverse());
    }
    async sendMessage(id, auth, dto) {
        const { user } = await this.roomAccess(id, auth);
        if (!dto.content.trim())
            throw new common_1.BadRequestException('Empty message');
        const message = await this.db.roomMessage.create({ data: { roomId: id, senderId: user.id, content: dto.content.trim() }, include: { sender: { select: { id: true, displayName: true } } } });
        this.events.emitRoom(id, 'message:new', message);
        return message;
    }
    async ban(id, userId, auth) {
        const { user, room } = await this.roomAccess(id, auth);
        const moderator = await this.db.roomModerator.findUnique({ where: { roomId_userId: { roomId: id, userId: user.id } } });
        if ((room.ownerId !== user.id && !moderator) || userId === room.ownerId)
            throw new common_1.ForbiddenException();
        await this.db.roomBan.upsert({ where: { roomId_userId: { roomId: id, userId } }, create: { roomId: id, userId }, update: {} });
        // Revoke active RTC session as well as future access.
        const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
        if (url && key && secret) {
            const client = new livekit_server_sdk_1.RoomServiceClient(url.replace(/^ws/, 'http'), key, secret);
            try {
                await client.removeParticipant(`boru_${id}`, userId);
            }
            catch (e) { /* offline participant */ }
        }
        this.events.kick(id, userId);
        this.events.emitRoom(id, 'participant:banned', { userId });
        return { ok: true };
    }
    async rtcToken(authorization, roomId) {
        const { user } = await this.roomAccess(roomId, authorization);
        const url = process.env.LIVEKIT_URL;
        const key = process.env.LIVEKIT_API_KEY;
        const secret = process.env.LIVEKIT_API_SECRET;
        if (!url || !key || !secret)
            throw new common_1.ServiceUnavailableException('LiveKit not configured');
        const token = new livekit_server_sdk_1.AccessToken(key, secret, { identity: user.id, name: user.displayName, ttl: '15m' });
        const seat = await this.db.roomSeat.findFirst({ where: { roomId, userId: user.id } });
        token.addGrant({ roomJoin: true, room: `boru_${roomId}`, canPublish: !!seat, canSubscribe: true, canPublishData: true });
        return { serverUrl: url, token: await token.toJwt(), roomId: roomId };
    }
    async participants(id, auth) {
        await this.roomAccess(id, auth);
        try {
            const participants = await livekitClient().listParticipants(`boru_${id}`);
            return participants.map(p => ({ id: p.identity, name: p.name, isSpeaking: false }));
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Live participant list unavailable');
        }
    }
    async moderators(id, auth) {
        await this.roomAccess(id, auth);
        return this.db.roomModerator.findMany({ where: { roomId: id }, include: { user: { select: { id: true, displayName: true } } } });
    }
    async addModerator(id, userId, auth) {
        const { user, room } = await this.roomAccess(id, auth);
        if (room.ownerId !== user.id)
            throw new common_1.ForbiddenException('Only owner can appoint moderators');
        const target = await this.db.user.findUnique({ where: { id: userId } });
        if (!target)
            throw new common_1.NotFoundException('User not found');
        const result = await this.db.roomModerator.upsert({ where: { roomId_userId: { roomId: id, userId } }, create: { roomId: id, userId }, update: {} });
        this.events.emitRoom(id, 'moderators:changed', { roomId: id });
        return result;
    }
    async removeModerator(id, userId, auth) {
        const { user, room } = await this.roomAccess(id, auth);
        if (room.ownerId !== user.id)
            throw new common_1.ForbiddenException();
        await this.db.roomModerator.deleteMany({ where: { roomId: id, userId } });
        this.events.emitRoom(id, 'moderators:changed', { roomId: id });
        return { ok: true };
    }
    async mute(id, userId, auth) {
        const { user, room } = await this.roomAccess(id, auth);
        const moderator = await this.db.roomModerator.findUnique({ where: { roomId_userId: { roomId: id, userId: user.id } } });
        if (room.ownerId !== user.id && !moderator)
            throw new common_1.ForbiddenException();
        if (userId === room.ownerId)
            throw new common_1.ForbiddenException();
        await this.db.roomSeat.updateMany({ where: { roomId: id, userId }, data: { userId: null } });
        try {
            await livekitClient().updateParticipant(`boru_${id}`, userId, undefined, { canPublish: false, canSubscribe: true, canPublishData: true });
        }
        catch (e) { /* offline */ }
        this.events.emitRoom(id, 'seats:changed', { roomId: id });
        this.events.emitRoom(id, 'participant:muted', { userId });
        return { ok: true };
    }
    async createRoom(auth, dto) {
        const user = await this.auth.user(auth);
        return this.db.room.create({ data: { title: dto.title, ownerId: user.id }, select: { id: true, title: true, isPrivate: true } });
    }
};
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Api.prototype, "health", null);
__decorate([
    (0, common_1.Post)('auth/register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", void 0)
], Api.prototype, "register", null);
__decorate([
    (0, common_1.Post)('auth/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", void 0)
], Api.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Api.prototype, "me", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Api.prototype, "rooms", null);
__decorate([
    (0, common_1.Get)('rooms/:id/seats'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "seats", null);
__decorate([
    (0, common_1.Post)('rooms/:id/seats/:number/take'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "takeSeat", null);
__decorate([
    (0, common_1.Delete)('rooms/:id/seats/:number'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "releaseSeat", null);
__decorate([
    (0, common_1.Get)('rooms/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "messages", null);
__decorate([
    (0, common_1.Post)('rooms/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, MessageDto]),
    __metadata("design:returntype", Promise)
], Api.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('rooms/:id/ban/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "ban", null);
__decorate([
    (0, common_1.Post)('rooms/:id/rtc-token'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "rtcToken", null);
__decorate([
    (0, common_1.Get)('rooms/:id/participants'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "participants", null);
__decorate([
    (0, common_1.Get)('rooms/:id/moderators'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "moderators", null);
__decorate([
    (0, common_1.Post)('rooms/:id/moderators/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "addModerator", null);
__decorate([
    (0, common_1.Delete)('rooms/:id/moderators/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "removeModerator", null);
__decorate([
    (0, common_1.Post)('rooms/:id/mute/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], Api.prototype, "mute", null);
__decorate([
    (0, common_1.Post)('rooms'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RoomDto]),
    __metadata("design:returntype", Promise)
], Api.prototype, "createRoom", null);
Api = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [Auth, Db, RoomEvents])
], Api);
// V6 economy: server-side atomic spending; development-only grants require a secret.
class SendGiftDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGiftDto.prototype, "receiverId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGiftDto.prototype, "roomId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendGiftDto.prototype, "giftId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], SendGiftDto.prototype, "requestId", void 0);
class DevGrantDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DevGrantDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], DevGrantDto.prototype, "requestId", void 0);
let EconomyApi = class EconomyApi {
    constructor(db, auth, events) {
        this.db = db;
        this.auth = auth;
        this.events = events;
    }
    async wallet(bearer) {
        const user = await this.auth.user(bearer);
        const w = await this.db.coinWallet.findUnique({ where: { userId: user.id } });
        return { balance: (w?.balance ?? 0n).toString(), currency: 'BORU_COIN', cashout: false };
    }
    async ledger(bearer) {
        const user = await this.auth.user(bearer);
        const rows = await this.db.coinLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
        return rows.map(x => ({ ...x, amount: x.amount.toString(), balanceAfter: x.balanceAfter.toString() }));
    }
    async gifts() { const rows = await this.db.gift.findMany({ where: { active: true }, orderBy: { priceCoins: 'asc' } }); return rows.map(x => ({ ...x, priceCoins: x.priceCoins.toString() })); }
    async packages() { const rows = await this.db.coinPackage.findMany({ where: { active: true } }); return rows.map(x => ({ ...x, coins: x.coins.toString() })); }
    async vipPlans() { return this.db.vipPlan.findMany({ where: { active: true } }); }
    async vip(bearer) { const user = await this.auth.user(bearer); return this.db.vipEntitlement.findFirst({ where: { userId: user.id, endsAt: { gt: new Date() } }, orderBy: { endsAt: 'desc' } }); }
    // Purchase verification must use the store server API and server notifications.
    // Never trust client-supplied success flags, prices, coins, or expiry dates.
    async verifyPurchase(bearer, dto) {
        await this.auth.user(bearer);
        if (!['APPLE', 'GOOGLE'].includes(dto?.platform ?? '') || typeof dto?.productId !== 'string' || typeof dto?.transactionId !== 'string')
            throw new common_1.BadRequestException('Invalid purchase request');
        throw new common_1.ServiceUnavailableException('Store server verification is not configured; no coins or VIP rights were granted');
    }
    async send(bearer, dto) {
        const sender = await this.auth.user(bearer);
        if (sender.id === dto.receiverId)
            throw new common_1.BadRequestException('Cannot gift yourself');
        const room = await this.db.room.findUnique({ where: { id: dto.roomId } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const [receiver, gift, banned] = await Promise.all([
            this.db.user.findUnique({ where: { id: dto.receiverId } }),
            this.db.gift.findUnique({ where: { id: dto.giftId } }),
            this.db.roomBan.findUnique({ where: { roomId_userId: { roomId: dto.roomId, userId: sender.id } } })
        ]);
        if (!receiver || !gift || !gift.active)
            throw new common_1.NotFoundException('Recipient or gift not found');
        if (banned || (room.isPrivate && room.ownerId !== sender.id))
            throw new common_1.ForbiddenException();
        // Unique requestId ensures replay cannot spend twice. All writes commit atomically.
        const result = await this.db.$transaction(async (tx) => {
            const prior = await tx.coinLedger.findUnique({ where: { referenceId: dto.requestId } });
            if (prior) {
                const previous = await tx.giftSend.findUnique({ where: { id: prior.reason.startsWith('GIFT:') ? prior.reason.slice(5) : '' } });
                if (!previous || previous.senderId !== sender.id)
                    throw new common_1.ConflictException('Request ID already used');
                return { transferId: previous.id, balance: prior.balanceAfter.toString(), duplicate: true };
            }
            const debit = await tx.coinWallet.updateMany({ where: { userId: sender.id, balance: { gte: gift.priceCoins } }, data: { balance: { decrement: gift.priceCoins } } });
            if (debit.count !== 1)
                throw new common_1.BadRequestException('Insufficient coin balance');
            const wallet = await tx.coinWallet.findUniqueOrThrow({ where: { userId: sender.id } });
            const transfer = await tx.giftSend.create({ data: { senderId: sender.id, receiverId: dto.receiverId, roomId: dto.roomId, giftId: gift.id, quantity: 1, costCoins: gift.priceCoins } });
            await tx.coinLedger.create({ data: { userId: sender.id, amount: -gift.priceCoins, balanceAfter: wallet.balance, reason: `GIFT:${transfer.id}`, referenceId: dto.requestId } });
            return { transferId: transfer.id, balance: wallet.balance.toString(), duplicate: false };
        }, { isolationLevel: 'Serializable' });
        if (!result.duplicate)
            this.events.emitRoom(dto.roomId, 'gift:sent', { transferId: result.transferId, senderId: sender.id, receiverId: dto.receiverId, giftId: gift.id });
        return result;
    }
    // NEVER deploy this endpoint to production. Real coin grants require store receipt verification.
    async grant(secret, dto) {
        if (process.env.NODE_ENV === 'production' || !process.env.DEV_GRANT_SECRET || secret !== process.env.DEV_GRANT_SECRET)
            throw new common_1.ForbiddenException();
        const amount = 10000n;
        return this.db.$transaction(async (tx) => {
            const prior = await tx.coinLedger.findUnique({ where: { referenceId: dto.requestId } });
            if (prior) {
                if (prior.userId !== dto.userId)
                    throw new common_1.ConflictException();
                return { balance: prior.balanceAfter.toString(), duplicate: true };
            }
            const wallet = await tx.coinWallet.upsert({ where: { userId: dto.userId }, create: { userId: dto.userId, balance: amount }, update: { balance: { increment: amount } } });
            await tx.coinLedger.create({ data: { userId: dto.userId, amount, balanceAfter: wallet.balance, reason: 'DEV_GRANT', referenceId: dto.requestId } });
            return { balance: wallet.balance.toString(), duplicate: false };
        }, { isolationLevel: 'Serializable' });
    }
};
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "wallet", null);
__decorate([
    (0, common_1.Get)('ledger'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "ledger", null);
__decorate([
    (0, common_1.Get)('gifts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "gifts", null);
__decorate([
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "packages", null);
__decorate([
    (0, common_1.Get)('vip-plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "vipPlans", null);
__decorate([
    (0, common_1.Get)('vip'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "vip", null);
__decorate([
    (0, common_1.Post)('purchases/verify'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "verifyPurchase", null);
__decorate([
    (0, common_1.Post)('gifts/send'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SendGiftDto]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "send", null);
__decorate([
    (0, common_1.Post)('dev/grant'),
    __param(0, (0, common_1.Headers)('x-dev-secret')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DevGrantDto]),
    __metadata("design:returntype", Promise)
], EconomyApi.prototype, "grant", null);
EconomyApi = __decorate([
    (0, common_1.Controller)('economy'),
    __metadata("design:paramtypes", [Db, Auth, RoomEvents])
], EconomyApi);
let AdminApi = class AdminApi {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }
    async check(token, roles = ['SUPER_ADMIN']) {
        const user = await this.auth.user(token);
        const role = await this.db.adminRole.findFirst({ where: { userId: user.id, role: { in: roles } } });
        if (!role)
            throw new common_1.ForbiddenException('Administrator permission required');
        return user;
    }
    async overview(token) {
        await this.check(token, ['SUPER_ADMIN', 'SUPPORT', 'COUNTRY_ADMIN']);
        const [users, rooms, gifts, packages, activeVip] = await Promise.all([
            this.db.user.count(), this.db.room.count(), this.db.gift.count(), this.db.coinPackage.count(),
            this.db.vipEntitlement.count({ where: { endsAt: { gt: new Date() } } })
        ]);
        return { users, rooms, gifts, packages, activeVip };
    }
    async users(token, skip = '0') {
        await this.check(token, ['SUPER_ADMIN', 'SUPPORT']);
        const n = Math.max(0, Math.min(100000, Number(skip) || 0));
        return this.db.user.findMany({ skip: n, take: 30, orderBy: { createdAt: 'desc' }, select: { id: true, publicId: true, displayName: true, email: true, suspendedAt: true, createdAt: true } });
    }
    async rooms(token) {
        await this.check(token, ['SUPER_ADMIN', 'SUPPORT']);
        return this.db.room.findMany({ take: 40, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, ownerId: true, isPrivate: true, createdAt: true } });
    }
    async catalog(token) {
        await this.check(token, ['SUPER_ADMIN', 'SUPPORT']);
        const [gifts, packages, vip] = await Promise.all([this.db.gift.findMany(), this.db.coinPackage.findMany(), this.db.vipPlan.findMany()]);
        return { gifts: gifts.map(x => ({ ...x, priceCoins: x.priceCoins.toString() })), packages: packages.map(x => ({ ...x, coins: x.coins.toString() })), vip };
    }
    async audit(token) {
        await this.check(token);
        return this.db.adminAudit.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    }
    async suspension(token, id, body) {
        const actor = await this.check(token);
        if (typeof body?.suspended !== 'boolean')
            throw new common_1.BadRequestException('suspended must be boolean');
        if (actor.id === id)
            throw new common_1.ForbiddenException('Cannot suspend yourself');
        const exists = await this.db.user.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException();
        if (await this.db.adminRole.findFirst({ where: { userId: id, role: 'SUPER_ADMIN' } }))
            throw new common_1.ForbiddenException('Cannot suspend super admin');
        return this.db.$transaction(async (tx) => {
            const user = await tx.user.update({ where: { id }, data: { suspendedAt: body.suspended ? new Date() : null }, select: { id: true, suspendedAt: true } });
            await tx.adminAudit.create({ data: { actorId: actor.id, action: body.suspended ? 'USER_SUSPEND' : 'USER_RESTORE', targetId: id } });
            return user;
        });
    }
    async gift(token, id, body) {
        const actor = await this.check(token);
        if (typeof body?.active !== 'boolean')
            throw new common_1.BadRequestException('active must be boolean');
        return this.db.$transaction(async (tx) => {
            const gift = await tx.gift.update({ where: { id }, data: { active: body.active } });
            await tx.adminAudit.create({ data: { actorId: actor.id, action: 'GIFT_STATUS', targetId: id, details: { active: body.active } } });
            return { ...gift, priceCoins: gift.priceCoins.toString() };
        });
    }
};
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "users", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "rooms", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)('audit'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "audit", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspension'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "suspension", null);
__decorate([
    (0, common_1.Patch)('gifts/:id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminApi.prototype, "gift", null);
AdminApi = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [Auth, Db])
], AdminApi);
// V9: all country-level access is enforced by server queries, never by client filters.
let SafetyApi = class SafetyApi {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }
    country(value) {
        if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value))
            throw new common_1.BadRequestException('ISO country code required');
        return value;
    }
    async report(bearer, body) {
        const actor = await this.auth.user(bearer);
        const profile = await this.db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { countryCode: true } });
        if (!profile.countryCode)
            throw new common_1.BadRequestException('Set verified country before reporting');
        if (!body?.targetUserId && !body?.roomId)
            throw new common_1.BadRequestException('Target required');
        if (!['ABUSE', 'HARASSMENT', 'SPAM', 'SAFETY', 'OTHER'].includes(body.category || ''))
            throw new common_1.BadRequestException('Invalid category');
        if (typeof body.description !== 'string' || body.description.trim().length < 10 || body.description.length > 2000)
            throw new common_1.BadRequestException('Description must be 10-2000 chars');
        if (body.targetUserId && !await this.db.user.findUnique({ where: { id: body.targetUserId } }))
            throw new common_1.NotFoundException('Target user');
        if (body.roomId && !await this.db.room.findUnique({ where: { id: body.roomId } }))
            throw new common_1.NotFoundException('Room');
        return this.db.userReport.create({ data: { reporterId: actor.id, targetUserId: body.targetUserId, roomId: body.roomId, countryCode: profile.countryCode, category: body.category, description: body.description.trim() }, select: { id: true, status: true, createdAt: true } });
    }
    async ticket(bearer, body) {
        const actor = await this.auth.user(bearer);
        const profile = await this.db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { countryCode: true } });
        if (!profile.countryCode)
            throw new common_1.BadRequestException('Set verified country before opening a ticket');
        if (typeof body.subject !== 'string' || body.subject.trim().length < 4 || body.subject.length > 160)
            throw new common_1.BadRequestException('Invalid subject');
        if (typeof body.description !== 'string' || body.description.trim().length < 10 || body.description.length > 4000)
            throw new common_1.BadRequestException('Invalid description');
        return this.db.supportTicket.create({ data: { userId: actor.id, countryCode: profile.countryCode, subject: body.subject.trim(), description: body.description.trim() }, select: { id: true, status: true, createdAt: true } });
    }
    async mine(bearer) {
        const actor = await this.auth.user(bearer);
        return this.db.supportTicket.findMany({ where: { userId: actor.id }, take: 30, orderBy: { createdAt: 'desc' }, select: { id: true, subject: true, status: true, resolutionNote: true, createdAt: true } });
    }
};
__decorate([
    (0, common_1.Post)('reports'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SafetyApi.prototype, "report", null);
__decorate([
    (0, common_1.Post)('support/tickets'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SafetyApi.prototype, "ticket", null);
__decorate([
    (0, common_1.Get)('support/tickets/mine'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SafetyApi.prototype, "mine", null);
SafetyApi = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [Auth, Db])
], SafetyApi);
let SafetyAdminApi = class SafetyAdminApi {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }
    async scope(token) {
        const actor = await this.auth.user(token);
        const roles = await this.db.adminRole.findMany({ where: { userId: actor.id } });
        if (roles.some(r => r.role === 'SUPER_ADMIN'))
            return { actor, global: true, countries: [] };
        const countries = roles.filter(r => r.role === 'COUNTRY_ADMIN' && r.countryCode).map(r => r.countryCode);
        if (countries.length)
            return { actor, global: false, countries };
        // Support personnel require a separate, explicit support workflow; no global access by default.
        throw new common_1.ForbiddenException('Country administrator role required');
    }
    filter(scope) { return scope.global ? {} : { countryCode: { in: scope.countries } }; }
    async reports(token, status = 'OPEN') {
        const scope = await this.scope(token);
        if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(status))
            throw new common_1.BadRequestException('Invalid status');
        return this.db.userReport.findMany({ where: { ...this.filter(scope), status }, take: 50, orderBy: { createdAt: 'desc' } });
    }
    async tickets(token, status = 'OPEN') {
        const scope = await this.scope(token);
        if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(status))
            throw new common_1.BadRequestException('Invalid status');
        return this.db.supportTicket.findMany({ where: { ...this.filter(scope), status }, take: 50, orderBy: { createdAt: 'desc' } });
    }
    async updateReport(token, id, body) {
        const scope = await this.scope(token);
        if (!['IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(body?.status || ''))
            throw new common_1.BadRequestException('Invalid status');
        if (typeof body.resolutionNote !== 'string' || body.resolutionNote.trim().length < 5 || body.resolutionNote.length > 2000)
            throw new common_1.BadRequestException('Resolution note required');
        return this.db.$transaction(async (tx) => {
            const record = await tx.userReport.findFirst({ where: { id, ...this.filter(scope) } });
            if (!record)
                throw new common_1.NotFoundException();
            const updated = await tx.userReport.update({ where: { id }, data: { status: body.status, resolutionNote: body.resolutionNote.trim(), assignedToId: scope.actor.id } });
            await tx.adminAudit.create({ data: { actorId: scope.actor.id, action: 'REPORT_STATUS', targetId: id, details: { status: body.status, countryCode: record.countryCode } } });
            return updated;
        });
    }
    async updateTicket(token, id, body) {
        const scope = await this.scope(token);
        if (!['IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(body?.status || ''))
            throw new common_1.BadRequestException('Invalid status');
        if (typeof body.resolutionNote !== 'string' || body.resolutionNote.trim().length < 5 || body.resolutionNote.length > 2000)
            throw new common_1.BadRequestException('Resolution note required');
        return this.db.$transaction(async (tx) => {
            const record = await tx.supportTicket.findFirst({ where: { id, ...this.filter(scope) } });
            if (!record)
                throw new common_1.NotFoundException();
            const updated = await tx.supportTicket.update({ where: { id }, data: { status: body.status, resolutionNote: body.resolutionNote.trim(), assignedToId: scope.actor.id } });
            await tx.adminAudit.create({ data: { actorId: scope.actor.id, action: 'TICKET_STATUS', targetId: id, details: { status: body.status, countryCode: record.countryCode } } });
            return updated;
        });
    }
    async stats(token) {
        const scope = await this.scope(token);
        const where = this.filter(scope);
        const [users, reportsOpen, reportsResolved, ticketsOpen, ticketsResolved] = await Promise.all([
            this.db.user.count({ where }), this.db.userReport.count({ where: { ...where, status: 'OPEN' } }),
            this.db.userReport.count({ where: { ...where, status: 'RESOLVED' } }), this.db.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
            this.db.supportTicket.count({ where: { ...where, status: 'RESOLVED' } })
        ]);
        return { users, reportsOpen, reportsResolved, ticketsOpen, ticketsResolved, scope: scope.global ? 'GLOBAL' : scope.countries };
    }
};
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SafetyAdminApi.prototype, "reports", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SafetyAdminApi.prototype, "tickets", null);
__decorate([
    (0, common_1.Patch)('reports/:id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SafetyAdminApi.prototype, "updateReport", null);
__decorate([
    (0, common_1.Patch)('tickets/:id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SafetyAdminApi.prototype, "updateTicket", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SafetyAdminApi.prototype, "stats", null);
SafetyAdminApi = __decorate([
    (0, common_1.Controller)('admin/v9'),
    __metadata("design:paramtypes", [Auth, Db])
], SafetyAdminApi);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({ imports: [jwt_1.JwtModule.register({ secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET required'); })() : 'INSECURE_DEV_ONLY_CHANGE_ME'), signOptions: { expiresIn: '15m' } })], controllers: [Api, EconomyApi, AdminApi, SafetyApi, SafetyAdminApi, admin_security_1.AdminMfaController], providers: [Db, Auth, RoomEvents] })
], AppModule);
//# sourceMappingURL=module.js.map