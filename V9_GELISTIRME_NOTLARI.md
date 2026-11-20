# BÖRÜ V9 – Moderasyon ve Destek

## Eklenenler
- Kullanıcı şikâyet kaydı: POST /api/v1/reports
- Destek talebi: POST /api/v1/support/tickets; GET /api/v1/support/tickets/mine
- Ülke kapsamlı admin şikâyet ve destek listesi: GET /api/v1/admin/v9/reports, /tickets
- Durum ve çözüm notu güncelleme: PATCH /api/v1/admin/v9/reports/:id, /tickets/:id
- Ülke kapsamlı temel istatistikler: GET /api/v1/admin/v9/stats
- Yönetici işlem denetim kaydı ve /v9 web paneli
- Kullanıcı kaydında ISO 3166-1 alpha-2 countryCode alanı (örn. TR)

## Kurulum
1. backend/.env.example üzerinden .env oluşturun; PostgreSQL ve JWT_SECRET yapılandırın.
2. cd backend && npm install && npx prisma generate && npx prisma migrate dev --name v9_moderation && npm run start:dev
3. cd admin && npm install && npm run dev; /v9 sayfasını açın.
4. V8 bootstrap-superadmin.ts ile ilk yönetici ataması yapılabilir.

## Güvenlik sınırları ve yapılacaklar
- Ülke bilgisi şu anda kullanıcı beyanıdır; ülke yöneticisi yetkileri için doğrulanmış ülke ataması ve değişiklik politikası gerekir.
- MFA/TOTP, hız sınırlama, destek personeli özel yetki akışları, ek kullanıcı doğrulaması, rapor spam önleme, kötüye kullanım incelemesi ve otomatik testler tamamlanmadı.
- V8 admin endpointleri ülke yöneticilerine genel erişim vermemelidir; V9 endpointleri ayrı kapsam denetimi uygular.
- Yeni kayıtlar countryCode alanı gerektirir; eski kullanıcıların ülke kodu migration/backfill ile doğrulanmalıdır.
- Gerçek mağaza ödemeleri ve cihaz testleri henüz tamamlanmadı. Üretime hazır değildir.
