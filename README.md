# İş Süreç Yönetimi

Sol menülü, responsive iş süreçleri yönetim paneli. Bu ilk sürüm Node.js bağımlılığı olmadan tarayıcıda çalışır.

## Çalıştırma

`index.html` dosyasını güncel Chrome veya Edge tarayıcısında açın.
Demo yönetici: `ayse.yilmaz@firma.com` / `1234`.
Demo personel: `mehmet.kaya@firma.com` / `1234`.

## İçerik

- Giriş ekranı
- Yönetici paneli ve özet istatistikler
- Kullanıcı, firma, dönem ve personel yönetimi menüleri
- Yetkilendirme, raporlar, personel soruları ve notlar menüleri
- Responsive sol navigasyon

## Duyurular, ünvanlar ve ayın elemanı

- Duyuruları herkes okuyabilir. Yönetici her zaman yayınlayabilir; personel için Yetkilendirme > Duyuru ekleme yetkisi gerekir. Bu izin başka yönetici yetkisi sağlamaz.
- Yetkilendirme menüsü yönetici olmayanlara gösterilmez. Doğrudan sayfa geçişinde oturum kapanmadan ana panele dönülür.
- Yönetici personel eklerken ad ve ünvan girer; mevcut personelleri Düzenle ile günceller. Ünvan, hesap rolünden bağımsızdır. Eski kayıtlarda “Ünvan belirtilmedi” gösterilir.
- Ayın Elemanı bölümünde ay seçilir. Tamamlanan her iş türü, personel + firma + gün başına bir işlem sayılır; tekrar kaydetmek sayıyı artırmaz.
- Mevcut iş kayıtlarında hata bilgisi olmadığından hatalı işlem sayısını yönetici girer. Hata oranı = hatalı / tamamlanan × 100. Eksik işler hata sayılmaz.
- En çok işlemi olan personel (eşitlikte bunlardan biri) hata incelemesi ve yönetici onayıyla yayınlanır. Sıfır işlemle seçim yapılmaz. Yayınlanan sayılar onay anındaki değerlerdir; sonraki değişiklikler için yeniden inceleme ve onay gerekir.

## Şifre güncelleme

Yönetim Paneli > Şifremi Güncelle alanında mevcut şifre, yeni şifre ve tekrarı girilir. Yeni şifre 8–128 karakter olmalıdır. Personel ve yönetici yalnızca kendi şifresini değiştirir. Güncelleme oturumu kapatmaz; sonraki girişte yeni şifre gerekir.

Değiştirilen şifreler e-posta hesabına bağlı olarak rastgele tuz ve PBKDF2-SHA256 (600.000 iterasyon) özetiyle saklanır; açık metin kaydedilmez. Güncel tarayıcıda yerel dosya, localhost veya HTTPS gerekir. Şifre değişikliği yalnızca bu tarayıcıda geçerlidir; tarayıcı verileri silinirse demo şifreleri geri gelir. Bu özellik sunucu tarafı kimlik doğrulamanın yerine geçmez.

`tests/password.html` şifre doğrulama, formdan güncelleme, eski/yeni şifreyle giriş, hesap ayrımı ve depolama hatası senaryolarını test eder. Yalnızca ayrı test profilinde çalıştırın.

## Önemli sınırlar

Veriler kullanılan tarayıcının `localStorage` alanındadır; farklı bilgisayarlar arasında paylaşılmaz. Demo hesapları kod içinde tanımlıdır. Personel kaydı eklemek yeni giriş hesabı oluşturmaz. Gerçek çok kullanıcılı kullanım için sunucu, veritabanı ve sunucu tarafında kimlik/yetki denetimi gerekir. Arayüz kontrolleri tarayıcı deposuna erişebilen birine karşı güvenlik sınırı değildir.

## Testler

- `tests/browser.html`: giriş, sayfa erişimi, duyuru yetkisi, ünvan, aylık hesaplama ve yönetici onayı testleri. Test sonunda depo eski haline getirilir; yine de yalnızca ayrı test profilinde çalıştırın.
- `tests/focused.html`: giriş → menü → personel sayfası ve JavaScript hata kontrolü.

Node.js veya ek paket gerekmez; sonuçlar tarayıcı sayfasında PASS / FAIL olarak görünür.
