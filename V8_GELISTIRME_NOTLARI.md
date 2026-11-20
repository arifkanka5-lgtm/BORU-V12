# BÖRÜ V8 – Süper Admin Paneli

## İçerik
- Next.js yönetim ekranı: özet, kullanıcılar, odalar, katalog, denetim kayıtları.
- NestJS /api/v1/admin/* uç noktaları; JWT + AdminRole veritabanı kontrolü.
- Kullanıcı askıya alma/geri açma ve hediye aktif/pasif işlemleri.
- Kritik işlemler AdminAudit tablosuna yazılır.
- Süper Admin rolü yalnızca sunucu CLI ile atanır; açık kayıt uç noktası yoktur.
- Coin ve VIP paketleri **salt okunur**; fiyat değiştirme ve coin verme API'si yoktur.

## Kurulum
1. backend içinde npm install; PostgreSQL bağlantısını .env üzerinden yapılandırın.
2. npx prisma migrate dev --name v8_admin (geliştirme ortamı).
3. Var olan normal kullanıcı hesabıyla kayıt olun.
4. `npx tsx scripts/bootstrap-superadmin.ts admin@example.com` komutunu **güvenli sunucuda** çalıştırın.
5. Backend: npm run start:dev; admin: npm install && npm run dev.
6. Admin panelinde /auth/login üzerinden elde edilen JWT'yi girin. Bu V8 geliştirme arayüzü tokenı yalnızca React belleğinde tutar.

## Üretim öncesi zorunlular
- Yönetici MFA, HttpOnly secure cookie/BFF oturumları, CSRF önlemleri ve sıkı CORS.
- Askıya alma işlemlerinin mevcut LiveKit/WebSocket oturumlarına derhal yansıması.
- Ülke yöneticisi için countryCode kapsam filtreleri; mevcut V8 uç noktaları ülke yöneticisine yalnızca global sayım özetini verir.
- API rate limiting, merkezi log, güvenlik testleri, DB migration review, mağaza satın alma doğrulaması.
- Panelde şikâyetler ve ödeme incelemeleri henüz yok; mevcut modeller de eksik.
- Gerçek kullanıcı verisiyle test yapılmadı; derleme/entegrasyon testleri bu ortamda çalıştırılmadı.
