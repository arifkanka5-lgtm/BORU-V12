# BÖRÜ V5 – Sesli Oda Arayüzü

## Eklenenler
- Mor/altın VIP oda tasarımı ve sekiz interaktif mikrofon koltuğu
- API üzerinden koltuk alma/bırakma, sohbet ve moderatör eylemleri
- LiveKit ses bağlantısı ve mikrofon aç/kapat düğmesi
- Canlı katılımcı listesi (LiveKit yapılandırıldığında)
- Hediye kataloğu için **yalnızca önizleme** (gerçek coin işlemi yok)
- Socket.IO olaylarında oda verilerini yenileme

## Önemli sınırlamalar
- Flutter SDK bu ortamda bulunmadığından uygulama derlenip cihazda test edilmedi.
- Ses tokenı koltuk durumuna göre verilir; koltuk sonradan alındığında mevcut tokenın publish izni otomatik artmayabilir. Tam senkronizasyon ve yeniden bağlantı akışı tamamlanmalı.
- Kullanıcı avatarı için sunucuda avatarUrl alanı var ancak oda koltukları API'si avatar döndürmüyorsa yer tutucu gösterilir.
- Moderasyon düğmeleri API yetkilendirmesine dayanır; yetkisiz kullanıcı 403 alır.
- Hediye mağazası ödeme veya coin transferi gerçekleştirmez.
- Bu sürüm üretim için hazır değildir.

## Kurulum
README.md ve LIVEKIT_KURULUM.md talimatlarını izleyin.
