# BÖRÜ V4 — Gerçek zamanlı oda yönetimi

## Eklenenler
- Socket.IO `/rooms` namespace: JWT ile kimlik doğrulama, odaya yetkili katılım, `seats:changed`, `message:new`, `moderators:changed`, `participant:muted`, `room:kicked`.
- Flutter oda ekranı websocket olaylarını dinleyerek koltukları ve mesajları yeniler.
- Oda sahibi moderatör atayabilir ve kaldırabilir. Oda sahibi/moderatör kullanıcı susturabilir ve yasaklayabilir.
- LiveKit tokenı koltuğu olmayan kullanıcılara `canPublish:false` verir; koltuk alma/bırakma işlemleri LiveKit izinlerini güncellemeyi dener.
- `/rooms/:id/participants` LiveKit canlı katılımcı listesini döndürür.

## Bilinen sınırlamalar — üretime hazır değildir
1. LiveKit ve veritabanı işlemleri dağıtık transaction değildir; LiveKit izin güncellemesi başarısız olursa durum uzlaşması (reconciliation) gerekir.
2. Oda erişim tokenı 15 dakika geçerli; yasaklamalarda mevcut tokenları engellemek için bağlantı düzeyinde ek denetimler ve webhook gerekir.
3. Socket.IO olayları tek backend instance'ı içindir; çoklu instance için Redis adapter gerekir.
4. Mobil ekranda moderatör atama ve susturma butonları henüz eklenmedi; API'leri hazırdır.
5. Mikrofon yayın akışı mobil ekranda koltuk alma sonrasında bağlanacak şekilde sonlandırılmalıdır. `VoiceRoomScreen` eski örnek ekrandır.
6. Oda sahibinin kendisini veya başka odanın kullanıcısını yanlışlıkla hedeflemesine karşı daha ayrıntılı kurallar ve testler gerekir.
7. WebSocket kimlik doğrulama, hız sınırlama, bildirim/çevrimdışı durumu ve uçtan uca testler tamamlanmalıdır.

## Kurulum
`cd backend && npm install && npx prisma migrate dev --name v4_moderators && npm run start:dev`

`cd mobile && flutter pub get && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1`

Canlı ses için `backend/.env` içinde LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DATABASE_URL ve JWT_SECRET tanımlanmalıdır.
