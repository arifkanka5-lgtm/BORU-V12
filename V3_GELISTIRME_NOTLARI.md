# BÖRÜ V3 – Oda etkileşimleri

## Eklenenler
- PostgreSQL: `RoomSeat`, `RoomMessage`, `RoomBan` modelleri.
- `GET /rooms/:id/seats`: koltuk ve katılımcı listesi.
- `POST /rooms/:id/seats/:number/take`: 1–8 arası koltuk alma, yarış durumuna karşı PostgreSQL advisory lock.
- `DELETE /rooms/:id/seats/:number`: kendi koltuğunu veya oda sahibinin herhangi bir koltuğu boşaltması.
- `GET /rooms/:id/messages`, `POST /rooms/:id/messages`: son 50 mesaj ve yeni mesaj.
- `POST /rooms/:id/ban/:userId`: oda sahibinin kullanıcıyı engellemesi, mümkünse LiveKit oturumundan çıkarması.
- Flutter: sekiz koltuklu oda görünümü, mesaj gönderme ve yenileme, ayrı LiveKit ses ekranına geçiş.

## Kurulum
`cd backend && npm install && npx prisma migrate dev --name room_interactions && npm run start:dev`

`cd mobile && flutter create . --platforms android,ios && flutter pub get && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1`

Canlı ortamda HTTPS ve güvenli LiveKit anahtarları gerekir. Gerçek cihazda API adresini değiştirin.

## Üretime çıkış öncesi zorunlu eksikler
- **Önemli:** Koltuk sahibi olma ile LiveKit yayın izni henüz birbirine bağlanmadı. Mevcut RTC tokenları `canPublish:true` verir; koltuksuz kullanıcı da ses yayınlayabilir. LiveKit yayın izinlerini yalnızca yetkili koltuk sahibine vererek sunucu tarafında uygulayın.
- Koltuk bırakıldığında veya kullanıcı engellendiğinde LiveKit izinleri ve koltuk durumu birlikte güncellenmeli.
- Mesajlar şu anda HTTP ile manuel yenilenir; WebSocket anlık olaylar, katılımcı varlığı ve oda moderatör rolleri henüz yoktur.
- Ban işlemi LiveKit sunucusuna erişilemediğinde DB yasağını kaydeder fakat mevcut ses bağlantısı açık kalabilir. Bu durum için kuyruk/yeniden deneme ve denetim kaydı ekleyin.
- Mesaj hız sınırlama, içerik moderasyonu, kullanıcı şikâyetleri, güvenli loglar ve otomatik testler gereklidir.
- Bu paket kaynak kod taslağıdır; Flutter ve backend derlemesi ile uçtan uca test yapılmadı.
