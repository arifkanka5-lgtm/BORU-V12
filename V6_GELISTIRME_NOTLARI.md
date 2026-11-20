# BÖRÜ V6 – Coin, hediye ve VIP veri modeli

## Eklenenler
- Prisma: CoinWallet, CoinLedger, CoinPackage, Gift, GiftSend, VipPlan, VipEntitlement, StorePurchase.
- API: GET /api/v1/economy/wallet, /ledger, /gifts, /packages, /vip-plans, /vip; POST /gifts/send.
- İdempotent ve transaction içinde hediye harcaması; bakiye kontrolü atomiktir.
- Geliştirme ortamına özel POST /api/v1/economy/dev/grant: x-dev-secret ile 10.000 test coini.
- Flutter: Coin bakiyesi ve hediye kataloğu ekranı.

## Henüz yapılmayanlar (kritik)
- Google Play Billing ve Apple StoreKit gerçek makbuz/sunucu doğrulaması.
- VIP haklarının mağaza bildirimleri ile aktif edilmesi, iptal/iadeler.
- Hediye alıcısı seçimi, gönderim butonu ve animasyon oynatımı.
- Ekonomi API rate limiting, spam kontrolü, yönetici paneli, denetim testleri.
- Transaction serialization conflict retry, mağaza webhookları ve fraud tespiti.
- Derleme ve cihaz testleri.

## Çalıştırma
1. `cd backend && npm install`
2. `.env.example` dosyasından `.env` oluştur; PostgreSQL URL ve JWT_SECRET yapılandır.
3. `npx prisma migrate dev --name v6_economy && npx prisma generate`
4. `npm run start:dev`
5. `cd ../mobile && flutter pub get && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1`

## Örnek hediye verisi
Prisma Studio (`npx prisma studio`) ile Gift tablosuna ad ve fiyat eklenebilir. Kullanıcı kimliği `GET /api/v1/me` ile bulunabilir. Test coin yüklemesi yalnızca geliştirme ortamında ve güvenli yerel ortamda yapılmalıdır.

## Güvenlik
Gerçek ödeme doğrulanmadan coin kredisi verilmez. Hediye alıcılarına coin aktarılmaz; yalnızca hediye olayı kaydedilir. Üretim ortamında test coin endpointi kapalıdır. Bu sürüm üretime hazır değildir.
