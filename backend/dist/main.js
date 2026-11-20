"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const module_1 = require("./module");
const admin_security_1 = require("./admin-security");
const jwt_1 = require("@nestjs/jwt");
async function bootstrap() {
    const app = await core_1.NestFactory.create(module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const mfa = new admin_security_1.AdminMfaMiddleware(app.get(jwt_1.JwtService));
    app.use('/api/v1/admin', (req, res, next) => mfa.use(req, res, next));
    await app.listen(Number(process.env.PORT || 3001));
}
bootstrap();
//# sourceMappingURL=main.js.map