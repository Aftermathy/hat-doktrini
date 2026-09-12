---
name: prototip
description: Bir şartname onaylanmadan önce kâğıttaki kararı elde denemek — durum modeli için tek dosyalık mantık prototipi, arayüz için tek dosyalık HTML. Use before approving a spec that encodes state rules, role permissions, money splitting, or a new screen.
---

# Prototip

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır.

Metin üzerinden verilen onay, metinde makul görünen her şeyi onaylar. Kusur
elde ortaya çıkar: bölüşüm kuralı kâğıtta adil, ekranda anlamsızdır; rol
matrisi tabloda tutarlı, akışta kilitlenir.

Prototip **hiçbir kapıyı kaldırmaz**; kapıya gelen işin kalitesini yükseltir.
Onay yine sahibin, ama artık metne değil çalışan bir şeye bakıyor.

## İki dal

### LOGIC — durum ve kural prototipi

Tek dosya, bağımlılıksız, çalıştırılabilir. Kural kümesini gerçek verilerle
sürer ve **kenar durumları tablo hâlinde** basar.

- Girdi kümesi elle seçilmez: sınırlar (sıfır, negatif, tek üye, tüm üyeler,
  eş zamanlı iki değişiklik) ve gerçek hayattan üç örnek.
- Çıktı **karar tablosudur**: girdi → beklenen → gerçek. Beklenen sütununu
  şartname doldurur; boş kalan hücre şartnamenin eksiğidir.
- Prototip kalıcı koda **girmez**. İşi bitince silinir ya da teste dönüşür.

### UI — tek dosyalık HTML

Tek `.html`, gömülü stil, sahte veri. Ekranın **yerleşimini ve hissini**
gösterir; gerçek bileşen kütüphanesi kullanılmaz, çünkü amaç kodu değil
kararı sınamak.

- Üç durum birden çizilir: dolu, boş, hata. Boş ve hata çoğu tasarımın
  atladığı yerdir ve kullanıcı ilk oraya düşer.
- En dar cihaz genişliğinde de çizilir.
- Ekran görüntüsü alınır ve **karara ekli** olarak saklanır: onay veren kişi
  metni değil görüntüyü onaylar.

## Ne zaman koşulur

- Şartname bir **durum makinesi** tarif ediyorsa (abonelik, hak sahipliği,
  davet, mutabakat).
- Bir **bölüşüm/hesap kuralı** varsa.
- Yeni bir **ekran** ya da mevcut ekranın yerleşimini değiştiren bir iş varsa.
- Şartname "şu his verilmeli" diyorsa — his metinle denetlenemez.

## Ne zaman koşulmaz

Saf arka uç işleri (migration, RLS, dizin), yeniden düzenlemeler ve belgeler.
Oralarda prototip yalnızca zaman yakar.

## Çıktının yeri

Prototip **repoya girmez**, çıktısı girer: karar tablosu ya da ekran
görüntüsü şartnamenin altına, yoruma. Sohbette bırakılan çıktı, sohbet
kapanınca yok sayılır.
