# BÖRÜ V10 — Admin MFA güvenliği ve beta hazırlığı

## Gerçekten eklenen
- Yönetici MFA: TOTP kayıt, doğrulama, durum endpointleri.
- AES-256-GCM ile saklanan MFA sırları, tekrar kullanımını engelleyen zaman adımı kontrolü.
- `/api/v1/admin/*` rotalarında MFA zorunluluğu.
- Web yönetim panelinde MFA kodu girişi.
- Güvenlik test senaryoları.

## Kurulum
1. `backend/.env.example` dosyasındaki `ADMIN_MFA_ENCRYPTION_KEY` için `openssl rand -hex 32` üretin.
2. `cd backend && npm install && npx prisma generate && npx prisma db push && npm run start:dev`.
3. Yetkili admin JWT ile `POST /api/v1/admin-security/mfa/enroll` çağırın. Dönen sırrı authenticator uygulamasına ekleyin.
4. Yeni TOTP koduyla `POST /api/v1/admin-security/mfa/confirm` çağırın: `{ "code": "123456" }` (gerçek kodu girin).
5. Yönetim isteklerine `Authorization: Bearer <JWT>` ve `x-admin-totp: <6-digit>` ekleyin. Her kod tek kullanımlıktır; yeni istek için yeni kod bekleyin.

## Bilinen sınırlar
- MFA tek kullanımlı zaman adımı gerektirir; panelde aynı 30 saniyede birden fazla API çağrısı ikinci istekte reddedilir. Üretim için kısa ömürlü MFA step-up oturumuna geçilmeli.
- Bu sürüm gerçek Apple/Google satın alma doğrulaması eklemez. Fail-closed kalır.
- LiveKit cihaz testi, yük testi, ödeme mağazası sandbox testi, otomatik entegrasyon testleri yapılmadı.
- Web admin tokenı halen manuel giriliyor; production için HttpOnly cookie ve CSRF önlemleri tasarlanmalı.
- Projede eksik Flutter platform dizinleri varsa `flutter create .` ile tamamlanmalıdır.
- Tüm yönetici endpointlerinde erişim kontrolleri ayrıca bağımsız güvenlik denetiminden geçmelidir.
