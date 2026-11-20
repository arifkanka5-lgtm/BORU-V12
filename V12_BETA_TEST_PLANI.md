# BÖRÜ V12 — Android beta doğrulama planı

## Teslim edilenler
- V11 kaynaklarının kopyası ve çevrimdışı ön kontrol betiği.
- Flutter temel ses ekranında mikrofon başlangıç durumunu `muted=true` olarak düzelten küçük bir değişiklik.
- HTTPS test API adresi gerektiren Android debug APK derleme betiği.

## Çalıştırma
1. `python3 scripts/v12_preflight.py` (Android proje dizini oluşturulmadıysa BLOCK beklenir).
2. Flutter SDK ve Android SDK yüklü geliştirme makinesinde `cd mobile && flutter create . --platforms android`.
3. `API_BASE_URL=https://test-api.example.com/api/v1 bash scripts/build_android_debug.sh` (örnek alan adını çalışan test sunucusuyla değiştirin).
4. `adb install -r mobile/build/app/outputs/flutter-apk/app-debug.apk`.

## Gerçek cihaz kabul senaryoları
- İki farklı kullanıcı ile oda oluşturma, giriş ve çıkış.
- İki telefonda aynı odada karşılıklı ses aktarımı.
- Mikrofon iznini reddetme, yeniden verme, uygulamayı arka plana alma.
- Koltukta olmayan kullanıcının yayın yetkisinin LiveKit sunucusunda reddedilmesi.
- Aynı koltuğa eşzamanlı iki katılımın yalnızca birine izin vermesi.
- Moderatör olmayan kullanıcının susturma ve çıkarma isteğinin reddi.
- Ağ kesintisi, tekrar bağlanma, ses kapatma ve oturum sonlandırma.
- Test sonuçlarının cihaz modeli, Android sürümü, tarih ve hata kayıtlarıyla belgelenmesi.

## Yayına engeller
Flutter/Android derlemesi ve iki cihaz testi henüz yapılmadı. LiveKit sunucu izinleri, moderasyon, ödeme doğrulaması ve kullanıcı güvenliği için bağımsız test gereklidir. Debug APK, Google Play üretim paketi değildir.
