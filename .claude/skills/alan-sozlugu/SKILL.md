---
name: alan-sozlugu
description: Projenin kavramlarını tek yerde adlandıran CONTEXT.md sözlüğünü kurmak ve canlı tutmak — aynı şeye dört ayrı ad veren ajanları tek dile bağlar. Use when multiple agents/models work on one codebase, when naming feels inconsistent, or when starting a new project.
---

# Alan sözlüğü (CONTEXT.md)

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır; **içeriği** her
projede yeniden yazılır.

Bir kod tabanında birden fazla model çalışıyorsa — biri şartnameyi yazıyor,
biri denetliyor, biri kodluyor, biri inceliyor — aynı kavram her turda
yeniden adlandırılır. "Kasa" mı "hesap" mı, "üye" mi "kullanıcı" mı, "harcama"
mı "işlem" mi: her PR'da yeniden pazarlık edilen bir şey, hiç kararlaştırılmamış
demektir.

Sözlük bu pazarlığı **bir kez** yapar.

## Ne içerir

Her terim için üç şey, fazlası değil:

```markdown
### Kasa
Birden fazla kişinin ortak bütçe tuttuğu birim. Kayıtlar, kategoriler,
hedefler ve limitler bir kasaya aittir; kullanıcı birden çok kasaya üye
olabilir.
_Kullanma:_ hesap, cüzdan, grup, bütçe
```

1. **Ad** — kodda ve arayüzde geçen biçim.
2. **Bir paragraf tanım** — kavramın *ne olduğu*, nasıl saklandığı değil.
3. **`_Kullanma:`** — reddedilen eşanlamlılar. Bu satır sözlüğün asıl işidir:
   bir terimi tanımlamak yarısı, **rakiplerini elemek** öbür yarısıdır.

## Ne içermez

- Tablo şeması, alan adı, tip. O bilgi kodda ve migration'da duruyor;
  sözlüğe kopyalanırsa ikisi ayrışır ve hangisinin doğru olduğu sorulur.
- Mimari kararlar. Onlar not dosyalarına yazılır.
- Kural. "Para tam sayıdır" bir kuraldır ve teknik kurallar belgesine aittir;
  sözlük yalnızca **adlandırır**.

## Nasıl canlı tutulur

- **Tek yazar.** Sözlük tek dosyadır ve tanımlar başka hiçbir belgede
  tekrarlanmaz. Teknik kurallar belgesinde bir terim tanımı varsa, oradan
  çıkarılıp buraya taşınır ve yerine atıf konur.
- **Prompt'ta zorunlu dosya.** Kaynak seçici bir bütçeyle çalışıyorsa sözlük
  bütçeden **önce** garanti edilir; kesilen ilk dosya olursa hiç yazılmamış
  sayılır.
- **Yeni terim, yeni satır.** Bir kavram ikinci kez farklı adla geçtiğinde
  düzeltme koda değil önce sözlüğe yapılır.
- **Kısa kalır.** Sözlük büyürse okunmaz; okunmayan sözlük yoktur. Yirmi-otuz
  terim çoğu proje için tavandır. Bkz. `prompt-butcesi`.

## İlk kurulumda

Terimleri hayal etme, **koddan çıkar**: tablo adları, dışa aktarılan tipler,
enum değerleri, arayüzdeki başlıklar. Sonra her birine sor: bu kavramın kaç
adı var? Birden fazlaysa biri seçilir, kalanlar `_Kullanma:` satırına yazılır.
