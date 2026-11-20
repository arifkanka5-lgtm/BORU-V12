# BÖRÜ V7 – Hediye gönderme ve VIP ekranları

## Gerçekten eklenenler
- Flutter sesli odada API üzerinden hediye kataloğunu açar.
- LiveKit katılımcı listesinden hediye alıcısı seçilir, kullanıcıdan onay alınır.
- POST /economy/gifts/send çağrısı yapılır; sunucudaki V6 atomik coin düşümü kullanılır.
- Cüzdan ekranında VIP plan kataloğu görüntülenir.
- POST /economy/purchases/verify giriş noktası eklendi. **Fail-closed**: gerçek Google/Apple doğrulaması olmadan hiçbir coin veya VIP hakkı vermez.

## Eksikler ve üretim engelleri
- Google Play Developer API / Apple App Store Server API imzalı işlem doğrulaması, bildirimler, iade/iptal senkronizasyonu **henüz yok**.
- Mobil mağaza satın alma SDK entegrasyonu **yok**.
- Animasyon dosyası oynatma ve hediye olaylarını animasyonlara bağlama **yok**.
- Mikrofon/koltuk yetkileri, rate limiting, bot önleme ve üretim güvenlik testleri tamamlanmalı.
- Sunucu ve Flutter gerçek derlemesi/cihaz testi yapılmadı.
- Bu paket ödeme kabul etmeye veya üretime açılmaya uygun değildir.

## Test adımları
1. PostgreSQL, LiveKit ve backend kurulumunu V6 README ile tamamla.
2. Gift ve VipPlan kayıtlarını Prisma Studio ile oluştur.
3. İki test hesabıyla aynı sesli odaya gir.
4. Yalnızca yerel geliştirme ortamında test coini ekle.
5. Hediyeler menüsünden hediye ve alıcı seç; onayla. Bakiye/ledger güncellenmesini kontrol et.
6. Satın alma doğrulama uç noktasının 503 dönmesini ve coin vermemesini doğrula.
