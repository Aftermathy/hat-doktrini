---
name: sorgulama
description: Ham bir fikri şartnameye çevirmeden önce sohbette olgunlaştırma turu — tek seferde tek soru, tavanlı, çıktısı issue gövdesine yazılır. Use when the owner has a raw idea, before opening a spec/issue, or when a spec keeps coming back with findings.
---

# Sorgulama

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır.

En pahalı hata kodda değil, **`taslak` etiketinin başında** olur. Ham bir not
doğrudan şartnameye çevrilince kurgu hatası hattın içine girer ve denetçiler
onu bulmak için koşu harcar; bulamazsa iş yapılır, sonra geri döner.

Bu tur hattı **hiç tetiklemeden** sohbette yapılır. Bedeli birkaç dakika,
karşılığı bir ya da iki denetim turu.

## Kim tetikler

**Yalnızca sahip.** Otomasyon bu turu başlatamaz: sorgulanan şey henüz
kimsenin yazmadığı bir fikirdir ve karşı taraf insandır.

## Nasıl işler

**Tek seferde tek soru.** Liste hâlinde beş soru sormak, beşine birden
yüzeysel cevap alır. Soru sorulur, cevap beklenir, cevap bir sonraki soruyu
belirler.

Soru sırası kabaca şu eksende ilerler:

1. **Kim ve ne zaman?** Bu işi hangi kullanıcı, hangi anda yaşıyor? Cevap
   "herkes, her zaman" ise fikir henüz bir iş değil.
2. **Bugün ne oluyor?** Mevcut davranış tarif edilmeden istenen davranış
   tarif edilemez. (Bu adım aynı zamanda "böyle bir koruma yok" iddiasını
   sınar — çoğu zaman vardır.)
3. **Kenar durum.** Sıfır, tek, çok, eş zamanlı, yetkisiz, geri alınmış.
   Fikrin çatladığı yer buradadır.
4. **Ne olmayacak?** Kapsam dışını yazmak, kapsamı yazmaktan daha çok iş
   kurtarır.
5. **Nasıl anlarız?** Kabul ölçütü. Ölçülemeyen bir ölçüt, ölçüt değildir.

## Tavan

- **En fazla beş-altı soru.** Sonrasında elde olan şartnameye yeter; daha
  fazlası sahibi yorar ve tur kendi amacını yer.
- **Cevap "bilmiyorum" ise bu bir cevaptır** ve şartnameye "açık kalan"
  olarak yazılır — sorgulamayı uzatmaz.

## Çıktının yeri

Oturumun çıktısı **sohbette bırakılmaz.** Doğrudan `taslak` etiketli issue
gövdesine yazılır ve numarası sahibe bildirilir. Sohbette kalan karar,
sohbet kapandığında yok sayılır.

Gövdenin iskeleti: bir paragraf **ne** ve **neden**, sonra kenar durumlar,
sonra kapsam dışı, sonra kabul ölçütü. Bu iskelet zaten şartnamenin
iskeletidir; triyajın işi kolaylaşır, denetçilerin bulacağı kurgu hatası
azalır.

## Ters yön: kendini sorgulatma

Aynı disiplin ajanın kendi planı için de geçerli. Bir iş kurmadan önce
sahibin sorması gereken tek soru: *"bu planın çöktüğü ilk yer neresi?"*
Cevap yoksa plan sınanmamıştır.
