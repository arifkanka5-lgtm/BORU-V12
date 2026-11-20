# BÖRÜ V12 GitHub ve Codemagic kurulumu

Bu arşivde `boru-v12` klasörünün **içeriği** depo köküne taşınmıştır. ZIP dosyasını GitHub'a tek parça olarak yüklemeyin; klasör ve dosyaları açılmış şekilde commit edin.

## Beklenen depo kökü
`mobile/pubspec.yaml`, `mobile/lib/main.dart`, `backend/`, `admin/`, `scripts/`, `codemagic.yaml`.

## Codemagic
1. GitHub'daki `BORU-V12` deposunu Codemagic'e bağlayın.
2. **Switch to YAML configuration** seçeneğini kullanın.
3. `codemagic.yaml` içindeki `boru_android_debug` iş akışını ve `main` dalını seçin.
4. Derleme bittiğinde `Artifacts` bölümünden `app-debug.apk` dosyasını indirin.

## Dikkat
- Android proje klasörü CI sırasında `flutter create` ile üretilir.
- Derlemede kullanılan `https://test-api.example.com/api/v1` sadece örnek adrestir; APK derlense bile gerçek backend bağlanmadan giriş ve oda işlevleri çalışmaz.
- Gerçek sunucu URL'si için YAML içindeki `API_BASE_URL` değerini değiştirin. Üretim sırlarını kaynak koda koymayın.
- Bu ilk APK debug/test sürümüdür; Play Store sürümü değildir.
- Kod henüz derlenerek doğrulanmamıştır. Derleme hatası çıkarsa Codemagic loguna göre düzeltme gerekebilir.
