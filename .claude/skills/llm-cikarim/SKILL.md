---
name: llm-cikarim
description: Modelden yapılandırılmış veri çıkarırken (OCR, ekstre, fatura, ayrıştırma) kapıların nasıl kurulacağı — çıktı tavanı, sessiz eleme, işaret ve biçim, kısayolun yavaş yolu kapatmaması. Use when extracting structured data with an LLM, or when extraction returns too few/zero rows.
---

# LLM ile yapılandırılmış çıkarım

Belgeyi modele verip JSON istemek kolay; **eksik geleni fark etmek** zor.
Buradaki maddeler Vault'un `ocr-extract` hattından, hepsi ölçülmüş.

## Çıktı tavanı en sık ve en sinsi arıza

Bir işlem satırı JSON'da 40-50 token eder. Beş sayfalık bir banka ekstresi
yüzden fazla işlem taşır → 5.000+ token. Üstüne **düşünme token'ları aynı
bütçeden yer**. Tavan 8.192 iken sonuç şuydu: model ayın tamamını değil ilk
bir buçuk sayfasını okudu, yirmi otuz satır döndürdü ve kalanını bıraktı.

- Tavanı **en kötü belgeye** göre koy, örneğe göre değil.
- `finishReason: MAX_TOKENS` ayrı bir kayıt satırı olsun. **Eksik bir çıktı,
  sıfır çıktıdan tehlikelidir**: eksik ekstre tam ekstre gibi görünür ve
  kullanıcı bunu ancak kendi hesabıyla fark eder.
- 200 satırlık bir iç tavan, ancak model o kadarını **yazabilirse** anlamlı.

## Sessiz eleme yasak

Sunucu tarafındaki doğrulayıcılar (tutar biçimi, tarih, tür) satırları
sessizce düşürüyorsa "sıfır satır" üç ayrı şeyi aynı yüzle gösterir:

1. model hiçbir şey bulamadı,
2. bulduğunun hepsi kapıda elendi,
3. yanıt kırpıldı.

Üçü ayrılmadan teşhis edilemez. Sıfır satırda **sayı** yazılır: ham satır,
elenen, `finishReason`, gönderilen sayfa/metin sayısı. İçerik yazılmaz —
elenen satır tam da beyaz listeden geçmemiş gövdedir.

## Biçim: istemek almak değildir

Sistem komutu "mutlak değer, ondalık nokta, binlik ayırıcı yok" dese bile
model belgede gördüğünü kopyalar. Ekstrede her satır eksiyle yazılıysa
imzalı dize gelir. Doğrulayıcı bunu **reddederse belgenin tamamı düşer**;
ölçüldü: beş sayfa çizildi, 1902 KB gönderildi, yanıt 19 saniyede döndü,
geriye sıfır satır kaldı.

Kural: **kırp, reddetme.** İşareti kırp, boşlukları temizle, sonra doğrula.
İşaretten tür çıkarma — bir fişin toplamı da artı yazılır ve gene giderdir.

## Girdi kalitesi modelden önce gelir

- **Metin katmanı varsa görsel gönderme.** PDF'te `getTextContent()` ile
  çıkarılan metin hem bedava hem kesin; ekstrede 14.944 karakter hazır
  duruyordu ve biz sayfaları JPEG'e çizip görsel modele yolluyorduk.
- **Vektör sayfayı büyütmek gerçekten detay demektir.** Fotoğraf için
  "büyütme yok" doğru kuraldır (olmayan piksel icat edilmez) ama PDF sayfası
  için yanlış: A4 595 piksel genişliğinde çizilirse ekstrenin satırları
  okunmaz ve model kötü modelden değil **kötü girdiden** yanılır.
- Sayfa görüntüsü boş dönebilir: WKWebView canvas bellek tavanını aşan
  `toDataURL` hata değil **boş dize** döndürür. Uzunluğu ölçmeyen bir kayıt
  bu arızayı hiç yakalayamaz.

## Kısayol yavaş yolu kapatamaz

Metin katmanı taraması bir hızlandırmaydı; çağrı sarmalanmamıştı ve
fırladığında bütün akışı düşürüyordu. Ortada sağlam bir belge, çalışan bir
görsel yolu ve ikisinin arasında duran bir optimizasyon hatası vardı.

> **Bir hızlandırma, kendi başarısızlığında yavaş yolu kapatamaz.** Kısayol
> eklerken sorulacak soru "çalışıyor mu" değil, "çalışmazsa ne oluyor".

## Zaman aşımı

Sağlayıcı istemcisi kendiliğinden zaman aşımına uğramıyor olabilir
(`supabase.functions.invoke` uğramıyor). Tavansız bir çağrı, sunucu yanıt
vermediğinde **sonsuza kadar** bekler: ekranda ne hata ne sonuç, donmuş bir
aşama. İstemci tavanı sunucununkinin **üstünde** olmalı ki sunucunun yazdığı
gerçek sebep, istemcinin genel "süre doldu"suna yenilmesin.
