---
name: hata-teshisi
description: Zor hatalar ve performans gerilemeleri için teşhis disiplini — önce kırmızıya dönebilen bir döngü kur, sonra hipotez. Use when diagnosing a hard bug, a silent failure, a flaky behaviour or a performance regression, in any layer (client, database, edge function, pipeline).
---

# Hata teşhisi

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır.

Zor bir hatanın zorluğu kodun karmaşıklığı değil, **geri bildirim
döngüsünün yokluğudur.** Kod okuyup teori üretmek ucuz görünür ve pahalıdır:
teori sınanmadığı için biriken her tur, bir sonrakinin varsayımı olur.

Cihaz katmanına inildiğinde bu skill'in Faz 1'inin oradaki uygulanışı
`capacitor-cihaz-teshisi`'dir; bu skill fazları ve kapıyı verir, o skill
motor tablosunu ve tezgâh yerleştirmeyi.

## Kapı

> **Kırmızıya dönebilen tek bir komutun yoksa hipoteze geçme.**

Komutun dört şartı var: (1) kullanıcının tarif ettiği **tam belirtiyi** ölçer
ve o belirti varken kırmızı döner, (2) deterministiktir, (3) saniyeler
mertebesindedir, (4) gözetimsiz koşar. Dördü sağlanmadan ilerlenen her adım
tahmin üstüne tahmindir.

## Faz 1 — döngüyü kur (skill'in kendisi budur)

Sırayla dene; yukarıdakiler daha ucuz:

1. **Başarısız test** — hataya ulaşan hangi dikiş varsa orada.
2. **HTTP/curl betiği** koşan bir servise karşı.
3. **CLI + fixture**, çıktıyı bilinen iyi bir anlık görüntüyle diff'le.
4. **Tarayıcı betiği** (Playwright): DOM, konsol ve ağ üzerinde iddia kur.
5. **Yakalanmış trafiği yeniden oynat** — gerçek isteği/olayı diske al,
   kod yolundan tek başına geçir.
6. **Atılabilir tezgâh** — sistemin küçük bir altkümesini tek fonksiyon
   çağrısıyla ayağa kaldır.
7. **Property/fuzz döngüsü** — "bazen yanlış" sınıfı için bin girdi.
8. **Bisection koşumu** — iki bilinen durum arasında `git bisect run`.
9. **Diferansiyel koşu** — aynı girdiyi iki sürüm/iki yapılandırmadan
   geçirip çıktıları diff'le.
10. **İnsan-döngüde tezgâh** — son çare. `scripts/hitl-dongu.sh` insanı
    adım adım yönlendirir ve cevabını `ANAHTAR=DEĞER` olarak geri alır.

Döngüyü **ürün gibi** ele al: bir kez kurulduktan sonra hızlandır (kurulumu
önbelleğe al), keskinleştir (belirtiye iddia kur, "çökmedi"ye değil) ve
belirlileştir (zamanı sabitle, tohumu ver, ağı dondur).

## Faz 2 — küçült

Tekrar üretimi en küçük hâline indir: kalan her öğe yük taşıyana kadar tek
tek ele. Küçülen repro hem hipotez alanını daraltır hem regresyon testinin
iskeleti olur.

## Faz 3 — hipotezleri sırala, sonra sına

Sınamadan **önce** 3-5 sıralı ve yanlışlanabilir hipotez yaz: *"X sebepse,
Y'yi değiştirmek belirtiyi yok eder."* Sıralama ucuzdan pahalıya değil,
**olasılıktan** gider.

Liste bir yere **yazılır** — issue yorumuna ya da PR açıklamasına. İnsan
onayı beklenmez; hat durmaz. (Bu, kaynağındaki "kullanıcıya göster" adımının
otonom hatta uyarlanmış hâli: kayıt kalır, kapı kalkmaz.)

## Faz 4 — probla, tek değişken oynat

Her prob bir hipoteze bağlıdır. Aynı anda iki şey değiştirme. Log yerine hata
ayıklayıcıyı tercih et; log gerekiyorsa **benzersiz önekle** etiketle:

```
[TESHIS-a4f2] beklenen=... gerçek=...
```

Temizlik tek `grep`'e iner ve "üretime log bırakma" kuralı bir temenni
olmaktan çıkar. Performans için log değil ölçüm + bisection kolu.

## Faz 5 — regresyon testi düzeltmeden önce

Testi **doğru dikişte** yaz. Dikiş yoksa bu bir bulgudur: *"bu davranışın
sınanabileceği bir yer yok"* cümlesi, mimarinin kendisi hakkında bir tespittir
ve nota yazılır.

## Faz 6 — kapanış

- Özgün repro artık kırmızı mı? (Değilse hata değil belirti kayboldu.)
- `grep -r "\[TESHIS-"` temiz mi?
- Atılabilir tezgâhlar silindi mi ya da kalıcı hâle mi getirildi?
- **Doğru çıkan hipotez** commit mesajına ve nota yazıldı mı? Bir sonraki
  teşhis, bu turun elediği hipotezleri yeniden elemek zorunda kalmasın.

## Bilinen arıza sınıfı: iş hiç başlamayan koşu

**İmza:** iş iki-dört saniyede, **tek adım koşmadan**, log üretmeden düşer.
Log indirilemez (404) çünkü üretilmemiştir. Aynı anda birden fazla iş akışı
düşüyorsa neredeyse kesindir.

Bu tabloda kodda sebep aramak zaman kaybıdır — iş akışı dosyası hiç
okunmamıştır. Gerçek cümle koşunun **check-run annotation**'ında durur ve
başka hiçbir yerde görünmez:

```sh
JOB=$(gh api repos/<sahip>/<depo>/actions/runs/<id>/jobs --jq '.jobs[0].id')
gh api repos/<sahip>/<depo>/check-runs/$JOB/annotations --jq '.[].message'
```

Ölçüldü (26 Ağustos, Vault): bütün hat on dört saat durdu, çıkan cümle
*"The job was not started because recent account payments have failed or your
spending limit needs to be increased"* idi — yani arıza kodda değil hesapta.
Bu sınıfın öbür üyeleri: geçersiz iş akışı dosyası, var olmayan SHA'ya
sabitlenmiş action, kaldırılmış runner etiketi.

**Hat dururken iş durmaz.** Kapı bir hüküm istiyorsa hükmün *kaynağı*
değişebilir: dallar yerelde koşturulup (kurulum, lint, derleme, test)
sonuç PR'a yazılır. Kural korunur, hüküm gecikmez — ama hangi işin CI'sız
geçtiği kayda geçer ve kapı açılınca ilk iş o gövdenin üstünden CI koşturmak
olur.

## Gizleme

Bu skill komut, çıktı ve yakalanmış veri gösterir. **Her sırrı önce gizle:**
yerine `<GİZLENDİ>` yaz. Kimlik bilgileri ortam değişkeninde kalsın,
gösterilen metne girmesin. Yakalanan istekler yetkilendirme başlığı taşır;
yalnızca sinyal taşıyan satırları alıntıla.

Bu kural otonom hatta ekstra sertleşir: teşhis çıktısı herkese açık PR
yorumlarına basılıyorsa API anahtarı oradan sızar.
