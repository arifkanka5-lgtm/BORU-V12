# BÖRÜ V11 — Android Beta Hazırlık Rehberi

## Gerçek durum
Bu paket **APK değildir**. Flutter ve Android SDK bu üretim ortamında kurulu olmadığı için Android derlemesi veya cihaz testi yapılmamıştır. V10 kaynaklarının üzerine yerel test araçları ve yapılandırma örnekleri eklenmiştir.

## 1. Gereksinimler
- Flutter SDK, Android Studio/SDK, JDK 17, Android cihaz veya emülatör
- Node.js 20+, npm, Docker Compose
- LiveKit sunucusu/Cloud kimlik bilgileri

## 2. Veritabanı
1. Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayın, güçlü POSTGRES_PASSWORD seçin.
2. `docker compose up -d` çalıştırın.
3. `backend/.env.example` -> `backend/.env` kopyalayın. DATABASE_URL içindeki parola ile compose parolasını eşleştirin. JWT_SECRET ve ADMIN_MFA_ENCRYPTION_KEY değerlerini güvenli oluşturun. LiveKit bilgilerini girin.
4. `cd backend && npm ci` (kilit dosyası yoksa `npm install`), ardından `npx prisma generate`, `npx prisma migrate dev` ve `npm run build`, `npm run start:dev`.
5. `python3 scripts/smoke_api.py` komutunu kök dizinden çalıştırın. Test, erişim ve HTTP yanıtlarını kontrol eder; ses kalitesini veya ödeme güvenliğini test etmez.

## 3. Android
1. `cd mobile && flutter create . --platforms android,ios` (mevcut Dart kodlarını koruyarak platform dosyalarını üretir).
2. `flutter pub get` ve `flutter analyze` çalıştırın.
3. `android/app/src/main/AndroidManifest.xml` içine INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS izinlerini ekleyin; Android 13+ için bildirim izni gerekiyorsa ayrıca değerlendirin.
4. Android emülatörü için `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1`.
5. Fiziksel cihazda aynı Wi-Fi ağındaki bilgisayarın LAN IP adresini kullanın. Güvenlik duvarını ve backend dinleme adresini doğrulayın. HTTP yalnızca yerel geliştirme içindir; yayın için HTTPS kullanın.
6. `flutter build apk --debug --dart-define=API_BASE_URL=https://YOUR_TEST_API/api/v1` ile **kendi bilgisayarınızda** APK üretin. Gerçek LiveKit bağlantısı için erişilebilir HTTPS/WSS ve uygun sertifika gerekir.

## 4. Manuel kabul testleri
- İki farklı cihazla kayıt/giriş, oturum kapanışı ve tekrar giriş
- Oda oluşturma, katılma, ayrılma, bağlantı kopup yeniden bağlanma
- Mikrofon izni reddedilince hata mesajı, yeniden izin verme
- 8 koltuk yarış durumu; iki kullanıcının aynı koltuğa geçememesi
- Koltukta olmayan kullanıcının ses yayınlayamaması (hem istemci hem LiveKit sunucusu)
- Susturma/odadan atma işlemlerinin yetkisiz hesaplarda reddedilmesi
- WebSocket kopması, yinelenen mesaj ve eşzamanlı işlemler
- Admin MFA ve rol/yetki sınırları; coin işlemlerinin tekrar işlenememesi

## 5. Yayına engel kritik işler
- LiveKit token izinlerinin, koltuk sahipliğinin ve mikrofon yetkisinin sunucu tarafında uçtan uca doğrulanması
- Kullanıcı ve admin oturum güvenliği, MFA, oran sınırlama ve yetki testleri
- Google Play Billing / Apple IAP sunucu doğrulaması
- Çocuk güvenliği, KVKK/GDPR süreçleri, raporlama ve moderasyon
- Android/iOS derleme, gerçek cihaz testi, yük testi ve mağaza onayları

**Bu paket beta hazırlığıdır; testten geçmiş veya yayınlanabilir uygulama olduğu iddia edilmez.**
