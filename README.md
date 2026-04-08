# Program Takip (Cihazlar arası senkron)

Bu proje tarayıcıda çalışır. Varsayılan olarak veriler `localStorage`'da tutulur (**tek cihaz**).

## Cihazlar arası görünmesi için (Öğrenci / Gözetici)

### 1) Firebase projesi oluştur
- Firebase Console → yeni proje
- Firestore Database'i aç (Native mode)

### 2) Web app ekle ve config'i yapıştır
- Project settings → **Your apps** → **Web app**
- Çıkan config'i `firebase-config.js` dosyasına yapıştır.

Dosya: `firebase-config.js`

### 3) Firestore kuralları (basit)
Geliştirme için en basit hali:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Not: Bu kural herkese açık okuma/yazma verir. İstersen daha güvenli hale getirebiliriz (auth + rol bazlı).

### 4) Kullanım
- `giris.html` aç
- Rol seç:
  - **Öğrenci**: ekleme/silme yapar
  - **Gözetici**: sadece görür
- İkisi de **aynı Grup Kodu** ile giriş yapınca kayıtlar iki cihazda da görünür.

