---
name: sartname-uyumu
description: Bir diff'in, atıf verdiği şartnamenin istediğini yapıp yapmadığını denetler — kod kalitesine değil, söz ile iş arasındaki uyuma bakar. Use when reviewing a PR that references an issue/spec, or before merging work produced from a written specification.
---

# Şartname uyumu

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır.

İki ayrı soru vardır ve karıştırılınca ikisi de sorulmamış olur:

1. **Kod kurallara uyuyor mu?** (lint, konvansiyon, kokular)
2. **Kod, istenen şeyi yapıyor mu?**

Birincisini lint ve denetçi botlar zaten soruyor. İkincisini çoğu hatta
**kimse** sormuyor: şartname denetimi kod yazılmadan önceki metne bakıyor,
kod denetimi metni hiç görmeden koda bakıyor. Aradaki uyum sorusu insanın
dikkatine kalıyor ve günde onlarca PR'da orada tükeniyor.

Bu skill yalnızca ikinci soruyu sorar. Kod kalitesine **bakmaz**; o başka
bir kapının işidir ve iki ekseni tek listeye indirmek birini diğerinin
altına gömer.

## Girdi

- **Diff:** sabit bir noktaya karşı, üç noktalı — `git diff <taban>...HEAD`.
  Ref'in çözüldüğü ve diff'in boş olmadığı **denetim başlamadan** doğrulanır;
  boş diff'te denetim koşmaz, "diff boş" diye rapor edilir.
- **Şartname:** commit mesajlarındaki atıflardan (`Closes #N`) çekilir.
  Atıf yoksa bu skill **hiç koşmaz** ve raporda "şartname yok" yazılır —
  şartnamesiz bir işi şartnameye uydurmaya çalışmak uydurma üretir.

## Üç soru, tek çıktı

Rapor üç başlıkta durur, birleştirilmez:

**1. Eksik ya da yarım gereksinimler.** Şartnamenin istediği ama diff'te
karşılığı olmayan maddeler. Her bulguda şartnamenin **ilgili satırı
alıntılanır**; alıntısız bulgu yorumdur, bulgu değildir.

**2. Kapsam kayması.** Şartnamenin istemediği hâlde eklenmiş davranış. Bu
bir kalite sorunu değil, bir **hesap verebilirlik** sorunu: onaylanan şey
başkaydı. Küçük ve masum görünen ekler burada yakalanır.

**3. Yanlış uygulanmış gereksinimler.** Yapılmış görünen ama şartnamenin
kastettiğini karşılamayan maddeler. En değerli bulgu sınıfı budur, çünkü
hem lint hem test yeşil geçer.

## Kurallar

- **Alıntı zorunlu.** Her bulgu şartnameden bir satır ve diff'ten bir dosya
  (mümkünse satır) gösterir.
- **Sıfır bulgu bir sonuçtur.** "Uyumlu" diye yazılır; sessiz kalınmaz.
  Söyleyecek sözü olmayan denetçinin sessizliği, denetim yapılmamış hâlden
  ayırt edilemez.
- **Şartnameyi genişletme.** Şartname eksikse bu bir **şartname bulgusudur**
  ve öyle raporlanır; denetçi eksik maddeyi kendi kafasından tamamlayamaz.
- **Bir kez koş.** Her push'ta değil, iş hazır olduğunda. Denetim fiyatı PR
  başınadır; `synchronize` olayına bağlanan bir denetim kotayı yakar ve aynı
  hükmü tekrar eder.

## Çıktı biçimi

```
## Şartname uyumu — #<numara>

### Eksik
- <bulgu>. Şartname: "<alıntı>". Diff: <dosya>

### Kapsam kayması
- …

### Yanlış uygulanmış
- …

Hüküm: uyumlu | <n> bulgu
```
