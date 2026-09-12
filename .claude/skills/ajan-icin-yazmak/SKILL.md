---
name: ajan-icin-yazmak
description: Ajanın okuyacağı metni (skill, doktrin, talimat, şartname) yazma disiplini — tetikleyici cümle, işaretçi kuralı, no-op talimat avı ve metnin kendi şişmesini ölçme. Use when writing or editing a SKILL.md, CLAUDE.md, agent doctrine, or any instruction an agent will read.
---

# Ajan için yazmak

SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır.

Ajanın okuduğu her satır bir bedel taşır ve bedeli **her çağrıda** ödenir.
`prompt-butcesi` prompt'a **basılan veriyi** bütçeler; bu skill **yazdığımız
metnin kendisini** bütçeler. İkisi ayrı kalemdir ve ikincisi çoğu zaman hiç
ölçülmez.

## Tetikleyici cümle

Bir skill'in `description` satırı, bağlamda **sürekli** duran tek parçasıdır
ve ne zaman açılacağını o söyler. Kuralları:

- **Tek tetikleyici, çok eşanlamlı.** "Hata ayıklama" yetmez; kullanıcının
  gerçekten yazdığı sözcükleri topla ("bozuldu", "çalışmıyor", "yavaş",
  "fırlıyor", "siyah ekran").
- **Ne yaptığını değil, ne zaman açılacağını yaz.** Gövde ne yaptığını
  anlatır; açıklama kapıyı tarif eder.
- **İki dil.** Türkçe yaz, sonuna İngilizce bir "Use when …" cümlesi ekle;
  tetikleme, kullanıcının hangi dilde yazdığına bağlı kalmasın.

## İşaretçi kuralı

Aynı bilgi iki yerde durmaz. Duruyorsa biri **işaretçi** olur:

> Bu konunun tek doğru kaynağı `docs/AGENT-WORKFLOW.md`; buradaki özet
> yalnızca ne zaman oraya bakılacağını söyler.

İşaretçi, kopyadan ucuzdur ve kopyanın bayatlama riski yoktur.

## No-op talimat avı

**Yeteneği olmayan her direktif ölü direktiftir.** Metinde şu kalıbı ara:
"şu etiketi koy", "şunu bildir", "kullanıcıya sor" — ve sor: *okuyanın bunu
yapabileceği bir yol var mı?* Yoksa talimat sessizce buharlaşır ve kimse fark
etmez, çünkü metin doğru görünür.

Ölçülmüş örnek: "otomatik onarım push'undan sonra CI dispatch edilmelidir"
direktifi aylarca yazılıydı ve iş akışında `workflow_dispatch` tetikleyicisi
yoktu; yani direktifin yeteneği hiç yoktu.

## Şişmeyi ölç

Doktrin metni tek yönde büyür: her arıza bir paragraf ekler, hiçbir düzelme
paragraf silmez. Ölçüt koy:

- **Satır sayısını izle.** Belge başına bir tavan yaz ve aşıldığında bölmeyi
  ya da işaretçiye çevirmeyi tartış.
- **Silme ölçülerek yapılır.** Doktrinden bir paragraf silinecekse, o
  paragrafın hangi arızadan doğduğu okunur; arıza hâlâ mümkünse paragraf
  kalır, kısalır.
- **Örnekler pahalıdır.** Bir kuralı üç örnekle anlatmak, kuralı üç kez
  ödemektir. Bir örnek yeter; ikincisi ancak birincinin kapsamadığı bir
  sınıfı gösteriyorsa girer.

## Yazarken

- **Kuralı gerekçesiyle yaz.** Gerekçesiz kural, bir sonraki mühendis
  tarafından haklı olarak kaldırılır.
- **Ölçüm varsa sayıyı yaz.** "Pahalı" değil, "çağrı başına 75.163 token".
- **Arıza sınıfına ad ver.** Adı olan arıza ikinci kez tanınır: *sessiz
  yedek*, *bayat yeşil*, *no-op direktif*, *hayalet dosya atfı*.
- **Emir kipiyle ve kısa.** Ajan üslup okumaz, kapı okur.
