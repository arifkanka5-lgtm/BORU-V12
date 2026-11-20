# BÖRÜ LiveKit entegrasyonu — Geliştirici kurulumu

Bu paket gerçek LiveKit RTC bağlantısı için örnek entegrasyon içerir. **Üretime hazır değildir; cihaz ve servis üzerinde test edilmemiştir.**

## 1. Backend
- Node.js 20+, PostgreSQL kurun.
- `cd backend && npm install`
- `.env.example` → `.env` kopyalayın. `DATABASE_URL`, güçlü `JWT_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` değerlerini doldurun.
- LiveKit Cloud projesi oluşturun veya kendi LiveKit sunucunuzu çalıştırın. API secret **yalnızca backend'de** tutulmalıdır.
- `npx prisma migrate dev --name init && npm run start:dev`
- `POST /api/v1/rooms/:id/rtc-token` Bearer JWT ile kullanıcıya özel, 15 dakika geçerli LiveKit tokenı üretir.

## 2. Flutter
- Flutter SDK yükleyin.
- `cd mobile && flutter create . --platforms android,ios && flutter pub get`
- Android `android/app/src/main/AndroidManifest.xml` içine `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` ve `<uses-permission android:name="android.permission.INTERNET"/>` ekleyin (manifest kökünde).
- iOS `ios/Runner/Info.plist` içine `NSMicrophoneUsageDescription` açıklaması ekleyin.
- Yerel HTTP yalnızca geliştirme için; üretimde HTTPS zorunludur. Android cleartext ve iOS ATS ayarlarını yalnızca yerel geliştirmede dikkatle yapılandırın.
- Android emülatörü: `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1`
- Gerçek cihaz: backend'in erişilebilir HTTPS adresini kullanın; localhost cihazın kendisidir.
- Giriş/kayıt yapın, oda oluşturun ve ikinci cihazdan aynı odaya katılarak sesi test edin.

## 3. Güvenlik ve eksikler
- Özel odalar için gerçek davet/üyelik kontrolü henüz yoktur: mevcut örnek özel odada yalnızca oda sahibine izin verir.
- Oda sahipliği, mikrofon koltuğu, susturma, ban ve moderasyon yetkilerini backend ve LiveKit tarafında uygulayın.
- Kullanıcıya RTC token verilmeden önce oda yasağı, hesap durumu ve erişim politikalarını kontrol edin.
- Tokenın kısa ömürlü olması mevcut bağlantıyı otomatik sonlandırmaz; kullanıcıyı uzaklaştırmak için LiveKit sunucu API'si gerekir.
- JWT varsayılan geliştirme secret'ı üretimde kesinlikle kullanılmamalı; başlatma aşamasında zorunlu ortam değişkeni doğrulaması eklenmeli.
- Login brute-force koruması, refresh token, e-posta doğrulama, cihaz güvenliği, telemetri, ses kalitesi ve ölçek testleri eklenmeli.
- LiveKit Flutter SDK sürümü ve işletim sistemi izinleri entegrasyon sırasında resmi dokümana göre doğrulanmalı.
