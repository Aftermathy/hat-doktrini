---
name: gozle-dogrulama
description: "Çalışıyor" demeden önce çıktıya bakmanın yolları — bileşenleri arka uçsuz mount eden vitrin, Playwright ekran görüntüsü, PDF'i görüntüye çevirme, ikonu iOS maskesiyle önizleme. Use before claiming a UI, document, or icon works; when a change is visual.
---

# Gözle doğrulama

Derlemenin yeşil olması "çalışıyor" demek değil. Görsel bir işte tek geçerli
kanıt **çıktının kendisi**: ekran görüntüsü, basılmış sayfa, maskelenmiş ikon.

Ölçüldü: rapor belgesinin başlıkları aylarca "GELIR / GIDER" diye basıldı
(Türkçe büyük harf hatası) ve iki test bu yanlışı **bekliyordu**. Kimse
belgeye bakmamıştı; testler yanlış davranışı doğruluyordu.

## Vitrin — bileşeni arka uçsuz mount et

Uygulamanın çoğu ekranı oturum ve ağ ister; onları beklemek görsel işi
imkânsızlaştırır. Çözüm, bileşenleri **sahte bağlamla** mount eden ayrı bir
sayfa (`dev/vitrin.html`). Kurarken üç tuzak:

1. **Sınıflar üretilmiyor olabilir.** Tailwind yalnızca `content` yollarını
   tarar; `dev/` orada değilse yazdığın yardımcı sınıfın karşılığı hiç
   üretilmez ve sayfa sessizce yanlış görünür. Ölçüldü: iki farklı düzen
   birebir aynı çıktı verdi. Tezgâhta **satır içi biçim** kullan.
2. **Bağlam sağlayıcısı ağa gidiyor olabilir.** Gerçek `Provider` kurulur
   kurulmaz istek atıyorsa tezgâhta kullanılamaz. Sağlayıcıyı değil,
   **bağlam nesnesinin kendisini** dışa aç ve sahte değeri sen ver.
3. **Modal bileşenler her şeyi kaplar.** Tam ekran sheet'ler galeriye
   konmaz; ayrı sayfada gösterilir.

Çekim, tek tek öğe bazında yapılır — sayfanın tamamı değil:

```js
el = pg.locator('[data-vitrin="Araçlar menüsü"]')
el.first.screenshot(path='ui-araclar.png')
```

## Motor seçimi

Playwright'ın **WebKit**'i Safari/iOS'a en yakın ortam; Chromium'da geçen bir
şey orada düşebilir. Cihaza inmeden önceki son durak burasıdır. Cihazın
kendisi gerekiyorsa `capacitor-cihaz-teshisi`.

## Belgeler

PDF üreten kod için tezgâh şart: örnek belgeyi üret, görüntüye çevir, **bak**.

```sh
ORNEK_PDF=/tmp/r.pdf npx vitest run scripts/ornek-rapor.test.ts
sips -s format png --out /tmp/r.png /tmp/r.pdf
```

Tezgâh test dosyası olarak durabilir ama ortam değişkeni verilmediğinde
**koşmamalı** (`it.runIf`), yoksa CI'da yük olur. Ve `src/` altına node API'si
kullanan bir dosya koyma: tip denetimi `@types/node` olmadan düşer ve `main`
kırmızıya gider (ölçüldü).

## İkon

App ikonunu düz görüntü olarak değerlendirme; iOS'un maskesiyle ve **gerçek
ölçülerde** bak (180/120/60/29 px). Bir işaret 1024'te güzel, 60'ta okunmaz
olabilir. Maskeyi yuvarlatılmış dikdörtgenle taklit etmek yeterli
(yarıçap ≈ %22,5).

## Kural

**Bir şeyin çalıştığını söylemeden önce ona bak.** Ölçüt "assert geçti" değil,
"çıktıya bakıldı". Assert, bakılmış bir çıktının **sabitlenmesidir**; bakma
işini üstlenmez.
