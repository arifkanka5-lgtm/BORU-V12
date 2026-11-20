# BÖRÜ — Başlangıç Kod Tabanı

Bu paket geliştirmeye başlanabilecek bir **iskelet** içerir; üretime hazır bir uygulama değildir.

## İçerik
- `backend`: NestJS, Prisma/PostgreSQL, JWT kayıt-giriş, profil ve oda endpoint'leri.
- `mobile`: Flutter giriş ve oda listesi prototipi (demo verilerle).
- `admin`: Next.js yönetim paneli başlangıç ekranı.

## Backend kurulumu
1. Node.js 20+, PostgreSQL ve npm yükleyin.
2. `cd backend && npm install`
3. `.env.example` dosyasını `.env` olarak kopyalayın; güvenli JWT anahtarı ve DATABASE_URL tanımlayın.
4. `npx prisma migrate dev --name init`
5. `npm run start:dev`

API: `http://localhost:3001/api/v1`.

## Mobil
Flutter SDK ile `cd mobile && flutter create . --platforms android,ios && flutter run`.
Mevcut ekranlar demo arayüzdür; API entegrasyonu yapılmamıştır.

## Yönetim paneli
`cd admin && npm install && npm run dev`.
Bu ekran yalnızca taslak; gerçek kimlik doğrulama ve yönetim API'si olmadan dağıtmayın.

## Üretime çıkmadan önce zorunlu işler
E-posta/telefon doğrulama, brute-force koruması, refresh-token rotasyonu, yetkilendirme, testler, veri silme/erişim süreçleri, içerik moderasyonu, ödeme doğrulama ve idempotency, log/izleme, yedekleme, mağaza uyumluluğu.
Coin ve hediye işlemleri bu iskelette özellikle **uygulanmamıştır**; güvenli ledger ve sunucu tarafı ödeme doğrulaması gerektirir.

## Sesli görüşme entegrasyonu
`LIVEKIT_KURULUM.md` dosyasını okuyun. Mobil uygulama giriş, oda listeleme/oluşturma ve LiveKit ses bağlantısı örnek kodlarını içerir.
