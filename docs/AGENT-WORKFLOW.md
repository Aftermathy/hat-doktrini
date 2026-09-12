# Ajan İş Akışı

Projeden bağımsız doktrin. Yeni bir oyun veya programa **olduğu gibi** taşınır
ve projede çatallanmaz: bir boşluk bulunduğunda düzeltme buraya yapılır ve tüm
projelere birden taşınır. Projeye özel her şey `CLAUDE.md`, `docs/` altındaki
belgeler, `.agentrc`, `ci.yml` ve `.coderabbit.yaml` içinde durur.

Bu ayrım kasıtlı: iş akışı aptaldır, belgeler akıllıdır. Bir ajanın ne bileceği
YAML'a gömülmez — çalıştığı reponun belgelerinden okunur. Kaynak kodun nerede
durduğu bile projeye aittir: workflow'lar dökümü `.agentrc`'den okur.

Her makine dosyası sınıfını ilk satırlarında taşır: `SINIF: GENEL` değiştirmeden
kopyalanır, `SINIF: PROJE` her projede yeniden yazılır. Karma dosya yoktur;
bir dosyaya proje bilgisi sızıyorsa bu bir hatadır ve buraya düzeltilir.

## Oyuncular

| Rol | Yapar | Yaşadığı yer |
|---|---|---|
| **Sahip** (insan) | Yön verir, onaylar, cihazda doğrular | Terminal, telefon |
| **Ürün yöneticisi** (LLM) | Ne yapılacağına karar verir, şartname yazar | GitHub Actions, olay tetiklemeli |
| **Mühendis** (LLM) | Şartnameyi koda çevirir, PR açar | Zamanlanmış bulut ajanı |
| **Yerel ajan** (LLM) | Depoya, veritabanına ve simülatöre erişir: migration uygular, Edge Function dağıtır, yerel testleri koşar, sahibin vekili olarak kuyruğu yürütür | Sahibin makinesinde, sohbetle |
| **Mimar** (LLM) | Her şartnameye deneyim gözüyle bakar: haptik, ses, görsel, animasyon, video. Ölçülülük ilkesiyle — en fazla iki dokunuş önerir, yoksa "yorum yok" der | GitHub Actions, iç kontrol tetiklemeli |
| **Derleyici** (CI) | Derler, lint eder. Kesin hüküm verir | Her push |
| **Denetçi** (LLM) | Kod inceler, kurallara göre yorumlar | Her PR |

Ürün yöneticisi ile mühendisin **ayrı olması** esastır. Aynı model hem işi
tanımlayıp hem yaparsa, kendi yanlış varsayımını doğrulayarak ilerler.

## Belgeler — ajanların ortak hafızası

| Dosya | İçerik | Kim okur |
|---|---|---|
| `docs/PRODUCT-DNA.md` | Ürünün ruhu: felsefe, ton, ne yapılmayacağı, kabul ölçütleri | Ürün yöneticisi (karakteri budur) |
| `docs/ROADMAP.md` | Fazlar, durum, **kapanmış kararlar ve gerekçeleri** | Herkes |
| `docs/notes/` | Mühendislikten ürüne geri kanal. Her not kendi dosyasında (`YYYY-MM-DD-konu.md`); silinmez, eskiyen not yenisiyle düzeltilir | Ürün yöneticisi, denetçiler |
| `CLAUDE.md` | Teknik kurallar, doğrulama komutları, dosya yapısı | Mühendis, denetçi |
| `.coderabbit.yaml` | Denetçinin arayacağı kurallar | Denetçi |
| `.agentrc` | Kaynak yolları ve uzantıları — workflow'lar dökümü buradan okur | Tüm denetçiler |
| `.github/scripts/llm.sh` | Metin üretiminin tek kapısı; sağlayıcı yedeği burada | Bütün LLM adımları |

**Kapanmış kararlar** tablosu en çok işe yarayan parçadır. Karar ve gerekçesi
yazılı olmazsa her yeni oturumda yeniden tartışılır.

## Etiketler — akışın tamamı

| Etiket | Anlam |
|---|---|
| `taslak` | Sahibin ham notu. Eklendiği an triyaj çalışır |
| `internal-check` | Şartname iç kontrolde: mühendis ve mimar görüş bildirir, ürün yöneticisi sentezler |
| `needs-approval` | İç kontrolden geçti, sahibin onayını bekliyor |
| `agent-ready` | Mühendis alabilir. **Bu etiket yoksa dokunulmaz** |
| `toplu` | Toplu sunum PR'ı. Denetçi **yalnızca** bu PR'a çağrılır |
| `sunuma-girmez` | Bu PR toplu sunuma alınmaz. Sahip bir konuyu turdan çıkarmak için koyar |
| `kusurlu` | Onaylanmış şartname sonradan kusurlu bulundu. Herkes koyabilir — mühendis, mimar, süpürücü, sahip. Süpürücü işi `internal-check`'e geri indirir ve `agent-ready`'yi düşürür. |

**Yığınlı PR açılmaz.** Bir iş başka bir işin dalına dayanıyorsa ya o iş
birleşene kadar beklenir ya da ikisi tek PR olur. Yığınlama iki ayrı şekilde
ısırıyor ve ikisi de ancak birleştirme anında görünüyor: taban dalı silinirse
çocuk PR **kapanır** (#287), silinmezse çocuk PR işi `main`'e değil **taban
dalına** birleştirir (#239). Birleştiren taraf için de kural: birleştirmeden
önce `gh pr view --json baseRefName` ile tabana bakılır.

**Bir şartname "şu koruma yok" diyorsa, ilk iş korumayı yazmak değil yokluğunu
doğrulamaktır.** Teşhis çoğu zaman kod okunmadan, sentezden yazılır; yanlış bir
fonksiyon adına atıf yapan bir madde, aranan korumayı aranmayan yerde durduğu
için yok sandırabilir. Var olan bir davranışı ikinci kez yazmak diff'te de
testte de görünmez — yalnızca haritada "tamamlandı" diye görünür, ve o an harita
hiç yapılmamış bir işi yapılmış saymaya başlar. Doğrulama yokluğu gösteriyorsa
iş yapılır; varlığı gösteriyorsa madde `kusurlu` ile geri gönderilir ve bulgu
`docs/notes/` altına yazılır (örnek: #274, 2026-08-18).
| `acil` | Öncelik şeridi: onaylandığında sıra atlar, kapıyı atlamaz |
| `lokal` | **Hattın dışında halledilen iş.** İki türü var: (a) yerel ajanın işi — veritabanı migration'ları, Edge Function dağıtımı, simülatör testleri, depo dışı komutlar; (b) **hattın kendi çalışma kurallarını konu alan iş** — iş akışları, CI, ajan doktrini. Bulut mühendisi dokunmaz, süpürücü taramaz, PM uyanmaz |
| `sende` | **Yalnızca sahibin yapabileceği** iş: fiziksel cihaz, mağaza ve ödeme hesapları, sağlayıcı panelleri, kart bilgisi, kimlik doğrulama |
| `needs-device` | Fiziksel cihaz/donanım gerektirir; tek başına kullanılmaz, `sende` ile gelir |

**Aciliyet kapı atlatmaz, sıra atlatır.** Ürün yöneticisi gerçekten engelleyen
bir işi (çökme, veri kaybı, güvenlik) `acil` önerebilir; sahip onayladığında
mühendis onu numara sırasına bakmadan önce alır. Sahibin kendi hızlı yolu da
vardır: tam şartname yazabiliyorsa issue'yu doğrudan `agent-ready` açar,
triyajı atlar. Atlanamayan tek şey sahibin onayıdır.

```
taslak → [ürün yöneticisi: şartname] → internal-check
   → [mühendis-check + mimar-check: görüş ya da "yorum yok"]
   → [ürün yöneticisi: sentez — kabul/ret gerekçeli, gerekirse revize]
        ├─ ürün işi     → needs-approval → [SAHİP] → agent-ready
        └─ iş akışı işi → lokal → [Claude bir turda çözer, hat dokunmaz]
   → [SAHİP] → agent-ready
   → [mühendis] → taslak PR → [CI + denetçi] → [SAHİP] → merge
   → [ürün yöneticisi anında uyanır] → sırada ne var
```

Her otonom adımın önünde bir insan kapısı vardır. Bu kapılar verimsizlik değil,
sistemin çalışma şartıdır.

**Sırayı etiket belirler.** Mühendis `agent-ready` etiketlilerden en küçük
numaralıyı alır; yani kuyruk, işin ne zaman **onaylandığına** göre işler, ne
zaman açıldığına göre değil. Bir işin beklemesini istiyorsan etiketi verme —
`needs-approval` durumundaki bir issue kuyruğun tamamen dışındadır.

Triyaj, şartnamenin sonuna bir **Sıralama** başlığı koyar: iş yol haritasının
neresine düşüyor, şimdi mi yapılmalı yoksa neyi bekliyor. İyi bir fikrin sırası
gelmemiş olabilir; bunu söylemek ürün yöneticisinin işidir, kararı sahibindir.

**Yerel ajan ile sahip ayrı aktörlerdir.** Bulut mühendisinin ulaşamadığı her
iş "insana düşen iş" değildir: veritabanına migration uygulamak, Edge Function
dağıtmak, simülatörde koşturmak — bunlar depoya ve proje anahtarlarına erişimi
olan **yerel ajanın** işidir (`lokal`). Sahibe yalnızca hiçbir otomasyonun
yapamayacağı şey kalır (`sende`): eline telefonu alıp hissi doğrulamak, mağaza
ve ödeme hesaplarında kimliğiyle işlem yapmak, kart ve sözleşme girmek. İkisini
tek etikette toplamak, yapılabilecek işi insanın masasında bekletir — sahibin
kuyruğu şişer, hat yavaşlar.

**Vekâlet açıkça verilir ve kapsamı yazılır.** Kapılar sahibindir; ama sahip
bir oturumda "benim adıma onayla" diyebilir. O zaman yerel ajan `agent-ready`
verebilir, PR birleştirebilir ve `sende` işlerinden **elinden geleni**
yapabilir. Vekâletin iki sınırı vardır ve bunlar devredilemez: **fiziksel
cihazda hissedilecek şey** (haptik, dokunmatik akıcılık, bildirimin gerçekten
düşmesi) ve **sahibin kimliğiyle yapılan işlem** (mağaza hesabı, ödeme, kart,
sözleşme, kimlik doğrulama). Vekâletle alınan her karar issue'ya gerekçesiyle
yazılır — sahip döndüğünde neyin hangi gerekçeyle onaylandığını okuyabilmeli.
Vekâlet o oturuma aittir; yeni oturumda yeniden verilmediyse kapı yine
sahibindir.

**Kalan tek kabul ölçütü cihazsa, iş `sende`ye geçer — `agent-ready`de
kalmaz.** `agent-ready` "ajan alabilir" demektir; alacak bir şey yokken orada
durması ajanı yanıltır. Ölçüldü (#364): şartnamenin bütün kod kapıları
kapandıktan sonra issue `agent-ready` + `acil` olarak kaldı ve mühendis onu
**her turda en önce** aldı — en küçük numaralı iş, üstelik acil. Dört tur,
şartnameyi ve kaynağı yeniden okuyup "yapılacak iş yok" demek için harcandı.
`acil` zararı katlar: yapılamayan bir iş, yapılabilecek işlerin önüne geçer.

Kapanış da aynı sebeple ertelenmez: cihaz doğrulaması bekleyen bir iş kapalı
değildir, ama ajanın kuyruğunda da değildir.

**Etiketi kim koyabilir:** Ürün yöneticisi issue açarken yalnızca `lokal`,
`sende` ve `needs-device` önerebilir (çıktısının ikinci satırındaki `Etiketler:` protokolü
ile). `agent-ready` bu protokolden **asla** geçmez — otomasyon kendi işini
onaylayamaz. Talimat metnine "şu etiketi koy" yazmak yetmez; modelin etiket
koyma yolu yoksa talimat sessizce buharlaşır. Yeteneği olmayan her direktif
ölü direktiftir.

## Doğuş ritüeli — fazları sistem yazar

Yeni projede sahip yalnızca iki şey yazar: `PRODUCT-DNA.md` (ürünün ruhu) ve
`ROADMAP.md`'nin ürün paragrafı. **Fazlar bölümü boş bırakılır.**

Ürün yöneticisi, fazsız bir yol haritası gördüğünde sıradan iş üretmez — o
koşunun işi **yol haritası taslağıdır**: DNA'yı ve (varsa) kodu okur, ürünü
fazlara böler, her fazın kapsamını ve sırasının gerekçesini yazar, bağımlılıkları
belirtir. Hepsi onay kutulu tek bir issue olarak sunulur; sahip kutuları düzeltir,
işaretler, `agent-ready` verir; mühendis onaylanan fazları `ROADMAP.md`'ye işler
— haritanın iskeletini `roadmap-keeper` yazamadığı için ("Yol haritasına PR
dokunmaz" kuralının sınırı, **Kurucu ilkeler** bölümünde, "Belgeler PR'ların
çakışma yüzeyi olmamalıdır" kuralının altında). "Kendin uydurma" kuralının tek
istisnası budur — ve çıktısı yine onaydan geçer.

Aynı ritüel projenin ortasında da geçerlidir: DNA değişir veya sahibin
yorumları haritayla çelişir hale gelirse, ürün yöneticisi faz sonunu beklemez;
harita revizyonunu öneren bir issue açar. Mekanizma aynıdır — öneri onay
kutulu, karar sahipte, yazım mühendiste.

## İç kontrol — üç bot, tek kapı

Şartname sahibin önüne gelmeden iki göz daha görür. Triyaj (ve ürün
yöneticisinin kendi açtığı işler) issue'yu `internal-check` etiketiyle bırakır;
bu etiket iki denetçiyi tetikler:

- **Mühendis-check** teknik gerçekliği sınar: var olmayan dosyaya atıf, gizli
  bağımlılık, açık işlerle çakışma, migration tuzağı. **Şartnamenin andığı
  dosyaları** okur — kodun tamamını her denetimde okutmak issue başına ciddi
  para eder ve bir gün modelin bağlam penceresini aşar; okumadığı dosya
  hakkında kesin hüküm vermemesi söylenir.
- **Mimar-check** deneyimi sınar: bu iş kullanıcının duyularına dokunuyor mu,
  dokunuyorsa hangi anda hangi hisle karşılanmalı. Zevk sınırları ürün
  DNA'sındadır; mimarın kendisi projeden bağımsızdır.

**Görsel yoruma konur, gövdeye değil.** Triyaj issue gövdesini şartnameye
çevirirken **yeniden yazıyor**; gövdedeki her ekran görüntüsü bağlantısı o
noktada düşer ve mimar bakılsın diye açılmış bir tura metinden girer (#462'de
ölçüldü: mimar iki kez "görsel yok elimde" yazdı). Yorumlar yeniden
yazılmıyor — görsel gerekiyorsa triyajdan **sonra** yorum olarak eklenir ve
iç kontrol yeniden tetiklenir.

Söyleyecek sözü olmayan denetçi **"yorum yok"** yazar — sessizlik değil, imzalı
onaydır. İki görüş de düştüğünde ürün yöneticisi sentez koşusunda görüşleri
tartar: haklı bulduğunu şartnameye işler, bulmadığını gerekçesiyle reddeder
(sessiz kabul de sessiz ret de yasaktır), işin fazını ve sırasını günceller,
etiketi `needs-approval` yapar ve sahibi mention'lar. Üç bot anlaşmış olsa da
`agent-ready`'yi yalnızca sahip verir — iç kontrol kapıyı kaldırmaz,
kapıya gelen işin kalitesini yükseltir.

Denetçiler ürün yöneticisinden **ayrı bir model ailesinde** koşar
(`ANTHROPIC_API_KEY`) — aynı modelin kendi şartnamesini denetlemesi, kendi
yanlış varsayımını onaylaması demektir. Roller ayrı model seçer:
`CLAUDE_ARCHITECT_MODEL` güçlü olmalı (ucuz model estetik yargıda uydurur ve
biçim kuralını dinlemez — ölçüldü), `CLAUDE_CHECK_MODEL` hedefli bağlam
sayesinde ucuz kalabilir. Anahtar yoksa ya da çağrı düşerse denetim **sessizce
kaybolmaz**: "denetim yapılamadı" notu düşülür ve akış sürer — sessiz kalmak,
kusurlu şartnameyi onaya göndermekten kötüdür.

## Doktrin ve iş akışı issue'ya dönüşmez

**Hattın kendi çalışma kurallarını konu alan hiçbir şey ürün kuyruğuna
girmez.** İş akışları, CI, ajan doktrini, etiket anlamları — bunlar sahiple
Claude arasında çözülür.

| Kim tespit etti | Ne olur |
|---|---|
| **Claude** | Doğrudan doktrine işler. Issue açmaz, onay beklemez. Commit mesajı neyin neden değiştiğini yazar — commit geçmişi doktrinin belleğidir. |
| **Hat (ajanlar)** | İç kontrol tamamlanır, sonra sentez işi `needs-approval` yerine **`lokal`**'e alır. Süpürücü ve PM o etiketi taramaz; iş, Claude'a bir tur verildiğinde çözülüp kapatılır. |
| **Duyuru** | Bir kez geçilir, herkes okur, konu kapanır. Açık issue olarak bekletilmez. |

**Neden:** Böyle bir kayıt üç şeyi birden bozuyor. Depoda olay tetiklemeli bir
ajan hattı var; açılan issue triyajı, PM'i ve süpürücüyü uyandırıp **faturalı
Actions dakikası ve token yakıyor**. Ajanlar kendi çalışma kurallarını tartışan
bir kaydı iş sanıp üstüne koşuyor. Ve karar zaten sahiple Claude arasında
çözülecekken gereksiz bir onay turuna giriyor.

Ayrımı sentez çıkışta yapıyor (`gemini-synthesis.yml`): başlıkta `ci:` /
`fix(ci)` / `chore(ci)` öneki ya da gövdede `.github/workflows` geçiyorsa iş
`lokal`e gider. Etiketle ayırmak daha temiz olurdu ama etiketi koyan da aynı
hat; metin, hattın uyduramayacağı tek işaret.

**Sınır:** Bu kural *kuralların kendisi* içindir. Ürün kodu ve şartname hatta
gitmeye devam eder — hattın var olma sebebi o.

## Hattın kendi kendini itmesi

Olay tabanlı bir hattın sessiz arızası şudur: tek bir tetikleyici düşer
(sağlayıcı kotası, ağ, bot etiketinin olay doğurmaması) ve iş orada durur.
Kimse hata görmez; yalnızca hiçbir şey ilerlemez ve sahip elle itmeye başlar.
Elle itilen bir hat otonom değildir.

Üç mekanizma bunu kapatır:

**Tek metin kapısı.** Her ajan `.github/scripts/llm.sh` üzerinden yazar.
Doğrudan `curl` atan adım muhasebenin dışında kalır: harcaması defterde hiç
görünmez, hangi modelin yazdığı hiç bilinmez. Kapı birinci sağlayıcı
düştüğünde ikincisine **kendiliğinden geçmez** — devralma `LLM_YEDEK=1` ile
açıkça açılır. Sebebi ölçüldü: sessiz devralma hattı haftalarca pahalı modelde
koşturdu ve arıza yalnızca faturada göründü. Varsayılan davranış "iş ertelendi"
demektir; süpürücü işi bir sonraki turda yeniden dener ve sahip hangi
sağlayıcının çalıştığını her zaman bilir. Bir hattı tek bir ücretsiz katmana
bağlamak o katmanın kotasını hattın kapasitesi yapar; sessizce ikinci katmana
geçmek ise kotayı faturaya çevirir. İkisi de kabul edilemez — bu yüzden seçim
sahibindir.

**Kavramların tek adı `CONTEXT.md`'de.** Şartnameyi bir model yazıyor, ikisi
denetliyor, biri kodluyor: aynı kavramın dört ayrı adı her PR'da yeniden
pazarlık ediliyordu. Sözlük prompt'a **bütçeden önce** giriyor; kesilirse hiç
yazılmamış sayılır. Yeni bir terim koda girmeden önce sözlüğe yazılır.

**Etiketsiz issue yoktur.** Hattın her kolu bir etikete bakar; hiçbiri
"etiketi olmayan"a bakmazdı ve akışın girişinde sessiz bir kör nokta vardı.
İçine düşen de tam olarak ajanların kendi açtığı arıza raporlarıydı:
`agent-ready` otomasyondan geçmediği için mühendis onları etiketsiz açıyor,
etiketsiz açılan iş kimseyi uyandırmıyor (#385 ve #390 iki gün öyle durdu,
sahip elle fark etti). Süpürücünün ilk kolu artık etiketsiz her açık issue'yu
`taslak` ile akışın girişine koyar — karar vermez, yalnızca kapıya bırakır.

**Süpürücü.** `pipeline-sweeper.yml` çeyrek saatte bir takılmışları arar:
şartnameye çevrilmemiş `taslak`, denetim yorumu eksik `internal-check`, iki
denetimi tamam olup sentezlenmemiş issue. Bulduğu her adımı yeniden tetikler.
Süpürücü karar vermez — yalnızca duran işi iter; kararlar yine ürün
yöneticisinde ve sahiptedir.

**Bakıcı ve bekçi.** `pr-nanny.yml` açık PR'ları tarar: incelemesi istenmemiş
sunum PR'ına denetçiyi çağırır, çakışan dalı tabanı birleştirerek onarır.
`roadmap-keeper.yml` birleşen PR'ın `Closes #N` atfını okuyup haritayı tek
yazar olarak günceller. İkisi de karar vermez, yalnızca duran işi yürütür.

**Süpürücü sonsuza kadar itmez.** Aynı iş beş kez itilip hâlâ ilerlemiyorsa
arıza o işte ya da bir adımdadır; çeyrek saatte bir yeniden denemek onu
düzeltmez, yalnızca kota yakar. Beşinci denemeden sonra süpürücü susar ve
issue'ya görünür bir not bırakır — sessizce vazgeçmek, sonsuza kadar denemek
kadar kötüdür.

**Sayaç her kolda olmalı.** Süpürücünün her kolu ayrı bir arıza sınıfını iter;
sayacı bir kola koyup ötekine koymamak, o kolu sonsuz döngüye açık bırakır.
Belge "beş kez" derken kod yalnızca tek yerde sayıyorsa yazılı olan bir söz
değil, bir temennidir.

**Hata yorumu ilerleme sayılmaz.** "Denetim yapılamadı" notu dolu bir yorumdur.
Yorum sayan her nöbet onu tamamlanmış denetim sanır, bir sonraki adımı
tetikler, o adım kapıya çarpıp geri döner ve arıza kendi kendini besleyen bir
döngüye dönüşür. İlerleme sayacı yorumun **varlığını** değil, **başarılı
olduğunu** saymalıdır.

**Kapı bedelden önce gelir.** Bir adım ücretli çağrı yapıp sonucu bir kapıda
çöpe atabiliyorsa, kapı çağrıdan önce sınanır. Sentez, denetimin yarım kalıp
kalmadığını çağrıdan sonra soruyordu: kapının girdisi çağrıdan önce hazırdı,
yine de her turda tam bedel ödenip üretilen metin kullanılmıyordu. Kapının
girdisi hazırsa kapı da oradadır.

Kural: **elle tetikleme gerekiyorsa bu bir hata raporudur.** Sahip bir işi
itmek zorunda kaldıysa, düzeltme o issue'ya değil, süpürücüye ya da kapıya
yapılır.

## Sunum adımı — denetim PR başına ödenir, satır başına değil

Hat günde 20-40 PR açıyor ve denetçilerin hepsi **PR başına** fiyatlanıyor.
Yani maliyeti belirleyen kodun büyüklüğü değil, kaç parçaya bölündüğü: aynı
satırlar 40 parçada 40 kez, tek parçada bir kez ödeniyor. Copilot 22 Ağustos'ta
tam bu yüzden bir günde bitti (inceleme başına 13 premium istek).

Bu yüzden birleştirmeden önce bir adım var. `toplu-pr.yml` belirli bir
pencerede biriken hazır PR'ları tek bir **sunum dalında** toplar ve sahibin
önüne tek PR çıkarır:

- Aday olmanın şartı hazır olmak: taslak değil, CI'sı yeşil, `main` ile
  çakışmıyor, kendi deposundan, `sunuma-girmez` etiketi yok.
- Dallar sunum dalına **`--no-ff`** ile birleşir ve sunum PR'ı da **merge
  commit** ile birleştirilmelidir. Squash, tekil PR'ların commit'lerini
  `main`'den erişilemez yapar; o zaman GitHub onları "birleşti" saymaz ve
  `Closes #N` atıfları hiç işlemez.
- Sunum dalında iki konu birbiriyle çakışırsa ikincisi turdan düşer, sunum
  gövdesinde gerekçesiyle görünür ve bir sonraki tura kalır. Sessiz kırpma yok.
- **Açık bir sunum dururken yeni tur açılmaz.** Hattın hızını sahibin bakma
  hızı belirler; ikinci sunum açmak aynı satırları ikinci kez denetletmek ve
  sahibe iki kapı göstermek olurdu.

Pencere `TOPLU_ARALIK_SAAT` depo değişkeninde, varsayılan **4 saat** — günde
altı tur. Sayı tahmin değil, üç ölçümün kesişimi:

- **Denetçinin tavanı.** CodeRabbit Pro saatte 5 inceleme veriyor: günde 120.
  Altı tur bunun %5'i, kalanı düzeltme sonrası tekrar incelemelere kalıyor.
- **Eski tempo tavanın üstündeydi.** Tekil PR düzeninde son 25 PR'ın ikisi
  (#379, #387) `rate limited` ile hiç incelenmeden yeşil geçti — %8. Sunum
  adımının asıl kazancı para değil, bu: denetim artık sessizce atlanmıyor.
- **Okunabilir boyut.** Ortalama PR 411 satır (son 40 PR). 4 saat normal
  tempoda 3-4 PR / ~1400 satır eder; 6 saat 5-10 PR / 2000-4000 satıra çıkar
  ve hem incelemenin derinliği hem sahibin dikkati orada düşer.

Abonelik değişirse değişecek olan bu sayıdır, iş akışı değil. Copilot geri
gelirse yeniden hesaplanır: onun fiyatı inceleme başına ve Pro+ ayda 115
inceleme ediyor — günde altı tur (ayda 180) taşar.

**Hükmü, koşuyu başlatan taraf yazar.** Sunum dalı `GITHUB_TOKEN` ile
itildiği için PR'da CI kendiliğinden koşmuyor; iş akışı CI'yı dispatch ediyor,
**bitmesini bekliyor** ve sonucu `Sunum CI` commit statüsü olarak SHA'ya
kendisi yazıyor. Arada bir `workflow_run` aynası denendi ve güvenilmez çıktı —
bir sunumda hüküm yazıldı, bir sonrakinde olay hiç doğmadı. Kapıda görünmeyen
hüküm hüküm değildir; zincire eklenen her halka onu kaybetmenin bir yolu daha
demek.

Kapının kendisi değişmedi: birleştirmeyi yine sahip yapar. Değişen, kapının
önüne kaç parça geldiği.

**Bu adım üç depo ayarına bağlı ve hiçbiri repoda dosya olarak durmuyor** —
yeni projeye taşırken elle kurulur:

1. *Allow GitHub Actions to create and approve pull requests* **açık.**
   Kapalıyken `gh pr create` GraphQL'de reddediliyor ve tur, dalı itmiş ama
   PR'ı açamamış hâlde kalıyor.
2. *Squash* ve *rebase* birleştirme **kapalı**, yalnızca merge commit açık.
   Bu bir zevk tercihi değil: squash, sunumun içindeki tekil PR'ların
   commit'lerini `main`'den erişilemez yapar ve o PR'lar "birleşti" sayılmaz,
   `Closes #N` atıfları hiç işlemez. Yanlış düğmeyi tıklamak mümkün olmasın
   diye düğme kaldırıldı.
3. *Automatically delete head branches* **açık** — tur başına bir sunum dalı
   doğuyor; temizlenmezse depo dalla dolar.

## Sahibe yazılan adımlar, hiç yapmamış birine yazılır

**Sahibin sözü (4 Eylül 2026):**

> açıklamalar çok kötü çünkü daha önce hiç yapamamış birine uygun değil,
> bundan sonraki issue'larda her adımı gözeterek yazın bana iş verecekseniz

`sende` ve `needs-device` etiketli her iş sahibin elinden geçiyor ve o işlerin
çoğu **ilk kez** yapılıyor: Xcode'da bir hedef yaratmak, portalda bir yetki
açmak, Dashboard'da bir SQL koşmak. Bunlar bizim için tek satır, sahip için
tanımadığı bir arayüzde tanımadığı bir düğme.

Kural: sahibe verilen her adım, o işi **hiç yapmamış** birine yazılır.

| Yazılmayacak | Yazılacak |
|---|---|
| "App Group yetkisini ekle" | "Xcode'da sol üstteki mavi proje simgesine tıkla → açılan listede **App** hedefini seç → üstteki **Signing & Capabilities** sekmesine geç → sol üstteki **+ Capability** düğmesine bas → arama kutusuna `App Groups` yaz → çift tıkla" |
| "Migration'ı koş" | "Supabase Dashboard'da soldaki menüden **SQL Editor** → sağ üstte **New query** → şu dosyanın içeriğini yapıştır → **Run** (⌘↵)" |

Her adımda üç şey bulunmalı:

1. **Nereye tıklanacağı** — menünün adı, sekmenin adı, düğmenin üstündeki yazı.
2. **Ne görüleceği** — adım doğru yapıldıysa ekranda ne belirir. Sahip böylece
   yanlış yerde olduğunu bir sonraki adımı denemeden anlar.
3. **Ters giderse ne olur** — hata metni neye benzer, ne anlama gelir.

Ayrıca:

- **Sıra numarası ver.** "Önce şunu, sonra bunu" değil; 1, 2, 3.
- **Tek adımda tek iş.** İki tık bir maddeye sığmaz.
- **Kısaltma açılır.** İlk geçtiği yerde: App Group (uygulama ile widget'ın
  ortak veri kabı), entitlement (yetki dosyası).
- **Değerler kopyalanabilir olsun.** `group.com.aftermathvibe.vault` gibi bir
  dize tarif edilmez, yazılır — tek karakter farkı sessiz arıza demek.

Bu kural yalnızca sahibe yazılan issue'lar için. Ajanlar arası şartnamelerde
kısalık hâlâ değerli; orada okuyan taraf arayüzü zaten tanıyor.

## Kapıya gelen işin kalitesi — üç yeni durak

Bu üç durak **hiçbir kapıyı kaldırmaz**; kapıya gelen işin kalitesini
yükseltir. Üçü de 25 Ağustos'ta dışarıdan bir skill koleksiyonu taranıp
kendi ölçülmüş arızalarımıza denk gelenler alındığında eklendi.

**Taslaktan önce: sorgulama.** Ham bir not doğrudan şartnameye çevrilince
kurgu hatası hattın içine girer ve denetçiler onu bulmak için koşu harcar.
Sahip fikri sohbette olgunlaştırır — tek seferde tek soru, en fazla beş altı
soru — ve çıktı **sohbette bırakılmaz**, doğrudan `taslak` gövdesine yazılır.
Bu turu yalnızca sahip tetikler. Bkz. `sorgulama` skill'i.

**Onaydan önce: prototip.** Metin üzerinden verilen onay, metinde makul
görünen her şeyi onaylar; kusur elde çıkar. Şartname bir durum makinesi, bir
bölüşüm kuralı ya da yeni bir ekran tarif ediyorsa tek dosyalık bir prototip
koşulur (mantık için karar tablosu, arayüz için tek HTML) ve **çıktısı
şartnamenin altına yorum olarak** eklenir. Mimar-check'e metinden fazlasını
veren tek üretimimiz budur. Bkz. `prototip` skill'i.

**Birleşmeden önce: şartname uyumu.** Hattın hiçbir kapısı *"bu diff, `Closes
#N` ile atıf verdiği şartnamenin istediğini yapıyor mu"* diye sormuyordu: iç
kontrol kod yazılmadan önceki metne bakıyor, denetçi botlar metni hiç görmeden
koda bakıyor. Aradaki uyum sorusu sahibin dikkatinde kalıyor ve günde 20-40
PR'da orada tükeniyordu. Denetim **taslaktan çıkan ilk PR'da bir kez** koşar,
`synchronize`'da asla; çıktısı üç başlıkta durur — eksik gereksinimler, kapsam
kayması, yanlış uygulanmış gereksinimler — ve her bulguda şartname satırı
alıntılanır. Bkz. `sartname-uyumu` skill'i.

## Geri alma — birleşen iş de yanlış olabilir

Hat birleşmeyi bir son sanıyor; oysa `main`'e inen bir iş de kırılabilir.
Kural üç adımdır:

**Önce kırığı durdur, sonra sebebini ara.** `main` kırıldıysa (CI kırmızı,
uygulama açılmıyor) ilk hamle onarım değil **geri almadır**: birleşmiş PR
`git revert` ile geri alınır ve sebep ayrı bir issue'da aranır. Yarım
onarımla ilerlemek, kırığın üstüne ikinci bir kırık koymaktır.

**Veritabanı geri alınmaz, ileri alınır.** Uygulanmış bir migration silinmez
ve düzenlenmez — geri almak gerekiyorsa **yeni sıralı bir migration** yazılır.
Kod geri alınıp veritabanı ileride kalabilir; bu kabul edilebilir tek yöndür.
Tersi — kod ileride, veritabanı geride — uygulamayı kırar. Bu yüzden migration
içeren bir PR birleştiğinde koşum görevi **hemen** yapılır, birikmez.

**Geri alınan iş haritada geri açılır.** `roadmap-keeper` bir maddeyi PR
birleşince işaretler; PR geri alınırsa işaret de geri alınmalı, yoksa harita
yapılmamış bir işi yapılmış gösterir. Geri alma PR'ının gövdesine hangi
issue'nun yeniden açıldığı yazılır ve o issue **yeniden açılır** — kapanmış
bir issue, kaybolmuş bir iştir.

## Faz sonu ritüeli

Bir faz bittiğinde sıradakine doğrudan geçilmez. Ürün yöneticisi iki iş açar:

**Stres testi — iki ayrı issue.** O fazda dokunulan her işlevin sınırlarını
zorlayan, onay kutulu listeler. Mutlu yol değil: boş ve aşırı uzun girdiler,
yetkisiz rol denemeleri, çevrimdışı ve yavaş ağ, eşzamanlı iki cihaz, yarıda
bırakılan akışlar.

Ürün yöneticisi bunu **tek issue olarak açmaz**; iki ayrı issue açar:

1. **"Faz N stres testi — yerel"**: simülatörde ve API üzerinden
   doğrulanabilenler (sınır girdiler, yetki ve RLS denemeleri, odak ve klavye
   akışları, ağ kapatılarak taklit edilen kesintiler, cihaz genişliği ve taşma).
   `agent-ready` verildiğinde yerel mühendis koşar, sonucu yorumla raporlar.
2. **"Faz N stres testi — cihaz"**: yalnızca gerçek donanımın kanıtlayabildiği
   maddeler (haptik his, dokunmatik akıcılık, gerçek uçak modu, sistem
   ayarlarından izin değişikliği, bildirimin fiilen düşmesi). `sende` +
   `needs-device` ile sahibe kalır.

Tek listede iki aktör olursa, biri bitse de issue kapanmaz ve ikisi birbirini
bekler görünür. Ayrı issue, ayrı kapanış.

**Aynı anda tek açık stres testi, tek açık öneri listesi.** Yeni bir faz sonu
geldiğinde önceki fazın açık kalmış testi **devralınır ve kapatılır**: işaretsiz
maddelerinden hâlâ anlamlı olanlar yeni listeye taşınır, kalanlar neden
düştüğü yazılarak bırakılır. Gerekçe basit — kod o fazdan bu yana değişti;
eski fazın kodunu bugünkü ikili üzerinde sınamak zaten mümkün değil. Biriken
test issue'ları sahibin kuyruğunu şişirir ve hiçbiri koşulmaz; tek ve güncel
bir liste koşulur.

**Cihaz testi tek kişiyle, tek cihazla koşulabilmelidir.** Sahip yalnızdır:
ikinci bir insan, ikinci bir telefon ya da eşzamanlı iki oturum isteyen madde
cihaz listesine yazılmaz. Çok taraflı senaryolar (iki üye, rol değişimi,
gerçek zamanlı senkron) **yerel ajana** yazılır — iki istemciyi API üzerinden
aynı anda konuşturmak onun işidir. Klavye, odak, `inert` ve erişilebilirlik
maddeleri de yerel paya aittir; cihaz listesinde yalnızca **elle hissedilen**
şey kalır: haptik, dokunmatik akıcılık, gerçek ağ kesintisi, sistem ayarı
değişikliği, bildirimin fiilen düşmesi.

**Stres testi hiçbir şeyi bloke etmez.** Sonucu bir sonraki fazın kapısıdır,
günlük işin değil: açık bir stres testi issue'su dururken mühendis sıradaki
işleri almaya devam eder. Kutular **işaretsiz açılır**; işareti ancak testi
fiilen koşan koyar — "geçti" diye açılan liste doğrulama değil süstür.

**Öneriler ve yol haritası güncellemesi.** Faz boyunca biriken her şey tek yerde
toplanır: mühendislik notlarındaki açık ürün kararları, denetçinin tekrar eden
uyarıları, sahibin yorumlarında geçip iş olmamış istekler, kodda görülüp planda
olmayan eksikler. Hepsi `- [ ]` onay kutusu olarak, gerekçesiyle ve gruplanmış
biçimde sunulur: sonraki faza, sonraya, yeni faz gerektirir, önerilmez.

Liste yalnızca eklemez, **çıkarmayı da değerlendirir**: haritada durup gerekçesi
kaybolmuş maddeler — kodun kendiliğinden çözdüğü, sahibin artık anmadığı, daha
iyi bir alternatifin geçersiz kıldığı işler — "Çıkarılması önerilenler" grubunda,
neden gereksizleştiği yazılarak sunulur. Plan yalnızca büyüyen bir şeyse plan
değil, birikintidir.

**Öneriler yalnızca faz değişiminde toplanır.** Ürün yöneticisi faz ortasında
biriken fikirleri tek tek issue'ya çevirmez; onları bu listeye biriktirir ve
faz sonunda bir kerede sunar. Aksi halde plan, bitmemiş bir fazın üstüne sürekli
yeni iş yığar ve hiçbir faz kapanmaz.

Sahip istediklerini işaretler ve `agent-ready` verir. O andan sonra issue sıradan
bir kodlama işidir: mühendis işaretli maddeleri `ROADMAP.md`'ye doğru faza ve
doğru sıraya yazar, gerekiyorsa yeni faz açar, PR olarak sunar. Haritaya dokunan
bu PR'ın işi haritayı yazmaktır; sıradan bir iş PR'ının haritaya dokunmama
kuralı yerinde duruyor (**Kurucu ilkeler** bölümünde, "Belgeler PR'ların
çakışma yüzeyi olmamalıdır" kuralının altında).

Bu, oylama gibi çalışır ama ayrı bir mekanizma gerektirmez — GitHub'ın kendi
onay kutuları ve mevcut etiket kapısı yeterlidir.

## Kurucu ilkeler

**Ürün yöneticisi saate değil olaya bağlanır.** Hiçbir şey ilerlemediyse
söyleyecek yeni sözü yoktur; saatte bir sormak aynı boş cevabı alır. PR
kapandığında, issue kapandığında veya belgeler değiştiğinde uyanır. Takvim
yalnızca taban olarak durur.

**Mühendis zamanlanır, ürün yöneticisi tetiklenir.** Mühendisin işi kuyrukta
bekler; belirli aralıklarla bakıp uygun iş yoksa hiçbir şey yapmadan durur.

**Boş koşu ucuzdur, yanlış koşu pahalıdır.** Ajan iş bulamayınca dal açmaz, kod
yazmaz. Bu yüzden sık çalışması sorun değil; kapıların gevşek olması sorundur.

**Ajan kodu okumalı, dosya adlarını değil — ama tamamını değil.** Adları görüp
içeriği görmeyen bir yönetici tahmin ederek şartname yazar. Ne var ki kaynak
büyüdükçe "tamamını oku" bir maliyet ve bağlam duvarına çarpar: dökümün bayt
bütçesi olur, denetçi şartnamenin andığı dosyaları hedefler, ürün yöneticisi
tamamını görmeye devam eder ama bütçe içinde. Kırpma her zaman görünür yazılır
ve okumadığı dosya hakkında ajanın kesin hüküm vermemesi söylenir.

**Plan ile kod çelişirse kod esastır.** Belgeler eskir, kod eskimez.

**Derleyici susarsa hat durur, ilerlemez.** CI kesin hükümdür; hüküm
gelmiyorsa (runner atanmıyor, dakika bitmiş, servis kesik) yeşil olmayan bir
PR birleştirilmez ve mühendis "CI koşmadı" diye taslaktan çıkarmaz. Bu
durumun imzası nettir: job saniyeler içinde, tek adım koşmadan, log
üretmeden düşer. Böyle bir tabloda yapılacak iş kodda değil hesapta ya da
serviste aranır; ajanların bunu **arıza olarak issue'ya yazması**, sessizce
kırmızıyla yaşamasından iyidir.

**Doğrulama ölçütü olmayan iş bitmiş sayılmaz.** Her şartnamede "nasıl
anlarız" bölümü olur.

**İnsana düşen iş sohbette bırakılmaz.** Cihazda test, hesap açma, anahtar
üretme, tarayıcıda ayar — hepsi `sende` etiketiyle issue olur. Sohbette söylenen
iş kaybolur; issue kaybolmaz.

**Kapanış yorumu bir rapordur, ajanlar onu okur.** Sahip bir işi kapatırken ne
yaptığını, neyle karşılaştığını veya neyin hâlâ tuhaf olduğunu yoruma yazar.
Ürün yöneticisinin bağlamına kapanan issue'lar **yorumlarıyla birlikte** girer;
yalnızca başlıkları okumak o bilgiyi çöpe atardı. Sessizce kapatılan bir iş,
öğrendiklerini de beraberinde götürür.

**Sohbette alınan karar repoya yazılmazsa yok sayılır.** Ajanlar sohbeti
görmez; yalnızca yukarıdaki belgeleri okur. Bir karar veya bulgu ortaya
çıktığında ait olduğu dosyaya taşınır — felsefe `PRODUCT-DNA.md`'ye, kapsam
`ROADMAP.md`'ye, kodda görülen kısıt `docs/notes/` altında yeni bir dosyaya, teknik kural
`CLAUDE.md`'ye, denetim kuralı `.coderabbit.yaml`'a. Bu temizlik işi değil;
ortak hafızayı beslemektir.

**Ajan bitiremediğini söyler.** Bulut ortamında olmayan bir yetenek (mobil
derleme, donanım, ödeme sağlayıcısı) varsa PR açıklamasında açıkça yazılır ve
insan doğrulaması istenir.

**PR'lar taslak açılır, hazır olunca incelemeye çıkar.** Doğrulanmamış iş
yanlışlıkla birleşmesin diye taslak; CI yeşile döndüğünde mühendis taslaktan
çıkarır, çünkü sahip yalnızca hazır bir PR'ı birleştirebilir. Ağır denetimler
(mimar ve ürün yöneticisi gözü, denetçi çağrısı) **incelemeye çıkışta** koşar:
taslak boyunca her düzeltme push'unda yeniden denetlemek, bitmemiş işi okuyup
aynı diff'i onlarca kez ödemektir.

**Okunmayan not, olmayan nottur.** Notlar dizini sınırsız büyür ama ajanların
bağlamı büyümez: okuyucular yalnızca en yeni birkaç düzine notu görür. Bu
kabul edilmiş bir kayıptır, çünkü alternatifi bağlamı ve faturayı sınırsız
büyütmektir. Kaybı azaltan şey **notun kaderi**: bir not ya kalıcı bir kurala
dönüşür (`CLAUDE.md`'ye teknik kural, `PRODUCT-DNA.md`'ye ürün kararı,
`ROADMAP.md`'ye kapanmış karar olarak yazılır) ya da zamanla düşer. Faz sonu
ritüelinde ürün yöneticisi biriken notları tarar ve kalıcı olması gerekeni
kural haline getirir; not dosyası arşiv kalır, davranışı belirleyen ise kural
olur. Bir bilginin yalnızca eski bir notta yaşaması, onu er geç kaybetmektir.

**Geri kanal iki yönlüdür.** Mühendis kodda görüp planda olmayan bir kısıt
bulduğunda `docs/notes/` altına yeni bir not dosyası yazar. Tek yönlü akış, ürün yöneticisini
gerçeklikten kopuk bırakır.

**Çakışma şartname aşamasında çözülür.** İki iş aynı ekrana veya aynı tabloya
dokunacaksa bu, dallar birleşirken değil, issue yazılırken görülmelidir. Ürün
yöneticisi yeni bir iş yazmadan önce açık issue'ları ve açık PR'ları tarar ve
üç seçenekten birini seçer: **birleştir** (ayrı yapılırsa birbirini bozacaksa
tek issue), **sırala** (biri diğerinin üstüne kurulmalıysa bağımlılığı issue'nun
başına yazar), **ayır** (örtüşme yoksa dokunma). Sessizce iki bağımsız issue
yazmak, çakışmayı insana fatura eder.

**Bağımlı iş, bağımsız dala kurulmaz.** Mühendis aldığı iş açık bir PR'ın
dosyalarına dokunuyorsa dalı `main` yerine o PR'ın dalı üzerine kurar ve PR'ını
o dala hedefler (`--base`). Diff yalnızca kendi değişikliğini gösterir. Alttaki
PR reddedilirse üsttekinin de geçersiz olduğu PR açıklamasında yazılıdır —
yığının çökmesi bilinen ve kabul edilmiş bir maliyettir. Çöktüğünde yeniden
planlama ürün yöneticisinindir: PR'ın birleşmeden kapandığını görür, bağımlı
issue'ları yeniden açar veya yeniden yazar.

**Belgeler PR'ların çakışma yüzeyi olmamalıdır.** Ölçüm: son on beş PR'ın on
dördü yol haritasına, on biri mühendislik notlarına dokunuyordu. Paralel giden
altı PR aynı dosyanın aynı bölgesine yazınca ilki birleştiği anda kalan beşi
çakışır ve sahibin tek onayı beş onarım işi doğurur. Kod dosyalarında bu
neredeyse hiç olmaz — sorun kodda değil, **ortak belgelerdedir**. İki kuralla
kapanır:

- **Notlar tek dosyada toplanmaz.** Her not `docs/notes/YYYY-MM-DD-konu.md`
  olarak kendi dosyasında durur. İki PR asla aynı dosyaya yazmaz; çakışma
  matematiksel olarak imkânsızdır. Notlar yine silinmez — eskiyen not, yeni
  bir notla düzeltilir. Okuyucular dizini tarih sırasına göre okur.
- **Yol haritasına PR dokunmaz.** Haritayı `roadmap-keeper` iş akışı günceller:
  birleşen PR'ın `Closes #N` atfını okur, haritada o numarayı taşıyan bekleyen
  satırı işaretler ve doğrudan `main`'e yazar. Tek yazar varsa çakışma da
  yoktur. Bu iş mekaniktir, LLM'e verilmez; numara satırda geçmiyorsa hiçbir
  şey tahmin edilmez, satır olduğu gibi bırakılır. Haritanın bayatlamaması bir
  dokümantasyon görevine değil bu otomasyona bağlıdır: bekçi PR birleştiği anda
  koşar, yani işaret işi bitiren turdan bağımsız olarak düşer. Ayrı bir
  "dokümantasyon görevi" bırakılsaydı hep en sona kalırdı ve harita bayatlardı —
  bayat harita, onu okuyan her ajanı birden yanıltır; bu sistemde dokümantasyon
  konfor değil, ajanların duyu organıdır. Bekçinin okuduğu ikinci işaret
  `harita: sabit-karar | <karar> | <gerekçe>` satırıdır: tabloya **yeni** bir
  sabit karar da PR gövdesinden geçer, PR'ın kendisinden değil.

**Bekçinin (`roadmap-keeper`) yazamadığı tek şey haritanın iskeletidir.** Bekleyen
bir satırı işaretleyebiliyor ve sabit kararlar tablosuna satır ekleyebiliyor;
**faz açamıyor, onaylanmış bir madde listesini haritaya yazamıyor.** Bu yüzden
doğuş ritüelinde onaylanan fazları ve faz sonu listesinde sahibin işaretlediği
maddeleri haritaya mühendis yazar (*Doğuş ritüeli* ve *Faz sonu ritüeli*
bölümleri, yukarıda) — ve bu, yukarıdaki kuralın
istisnası değil sınırıdır: haritaya dokunan PR, **işi haritaya yazmak olan**
PR'dır. Sıradan bir iş PR'ı haritaya hiçbir koşulda dokunmaz.

**PR açılınca inceleme kendiliğinden istenir, birleştirme asla kendiliğinden
olmaz.** Bakıcı iş akışı her yeni PR'da denetçiyi çağırır ve yarım saatte bir
açık PR'ları tarayıp çakışanları onarır: tabanı dala birleştirir, çözülemeyen
kod çakışmasında mühendisi göreve çağırır. Böylece sahip PR'a baktığında iş
hazır bulunur — inceleme yapılmış, dal temiz. **Birleştirme kapısı sahiptedir
ve otomasyona hiçbir koşulda devredilmez.**

**Çakışan PR sahipsiz kalmaz.** `main` ilerledikçe açık PR'lar çakışabilir.
Mühendisin her koşudaki ilk görevi yeni iş almak değil, açık PR'larını
denetlemektir: karşılanmamış inceleme bulgusu ve birleşemez (conflicting) dal.
Çakışmayı `main`'i dala birleştirerek onarır. Yalnızca-ekleme dosyalarındaki
çakışmalarda (mühendislik notları gibi) iki taraf da tutulur, tarih sırasına
konur.

**Issue'yu birleşme kapatır, unutkanlık açık bırakmaz.** PR `main`'e indiği
anda deterministik bir süpürücü, o PR'ın ve altında birleşmiş yığın
üyelerinin `Closes #N` atıflarını ve `issue-N-` dal adlarını okuyup açık
kalan issue'ları kapatır — GitHub yığınlanmış PR'ları kendiliğinden kapatmaz,
bu boşluk makineyle kapanır. Bu iş mekaniktir ve LLM'e verilmez. Mühendisin
saatlik bakımı yalnızca yargı isteyen artıkları toplar: kapsamı kısmen sevk
edilmiş bir iş kapanmaz, neyin kaldığı yorumla yazılır.

**Anlaşmazlığın hakemi sahiptir.** Denetçi yanılabilir; mühendis bir bulguya
gerekçeli yanıt yazdıysa bulgu karşılanmış sayılır ve aynı konu yeniden
tartışılmaz. İki taraf da ısrarcıysa karar birleştirme anında sahibindir.
Denetçinin üç ayrı PR'da tekrarladığı konu ise artık bulgu değil kalıptır —
onu ürün yöneticisi ele alır.

**Aynı işi iki koşu alamaz.** Mühendis bir işe başlamadan issue'ya "üzerinde
çalışıyorum" yorumu bırakır; seçim yaparken son saatlerde böyle yorum almış
issue'ları atlar. Uzun süren bir koşuyla yenisinin aynı işi kapması, iki
yarım PR demektir.

**Veritabanı değişikliği birleşmekle bitmez.** Migration içeren PR, açıklamasının
en üstünde bunu duyurur. Birleştiğinde, migration'ları çalıştırmayı isteyen bir
`sende` görevi var olmak zorundadır; yoksa ürün yöneticisi açar. Kod birleşti
diye veritabanı değişmiş olmaz; bu adım atlanırsa uygulama veritabanından önde
koşar ve kırılır.

## Kaynak dökümü — prompt kod tabanıyla birlikte büyümez

**Kural yalnızca kaynak için değil: prompt'a dosya basan her blok bütçelidir.**
Notlar bloğu 25 Ağustos'a kadar bütçesizdi ve tam metin basılıyordu; depo
notla doldukça denetim çağrısının girdisi yedi kat büyüdü (10K → 75K token) ve
bu hiçbir yerde görünmedi, çünkü artış her gün biraz oldu. Notlar artık
`not-ozet.mjs` ile **başlık + bulgu** olarak giriyor (92 KB → 8 KB). Bütçesiz
bir blok bugün küçüktür, yarın faturanın en büyük kalemidir.

Ajanın şartname yazarken gerçek dosya ve fonksiyon adlarına atıf yapabilmesi
için kodu görmesi gerekir. Bu yüzden kaynak dökümü prompt'a basılır. Ama
**dökümün tamamını basmak, prompt'u kod tabanının büyümesine bağlar** ve o
büyüme durmaz.

Bu projede tam olarak bu oldu: döküm 13 Ağustos 2026'da 314 KB'tı, 21
Ağustos'ta 1.210 KB. 17 Ağustos'ta sağlayıcının dakikalık girdi tavanını
aştı ve **triyaj o günden sonra tek bir başarılı koşu üretmedi.** Arıza
haftalarca görünmedi, çünkü ürün yöneticisinin dökümü bütçeliydi ve o
çalışmaya devam etti; ayrıca yedek sağlayıcı sessizce devralıyordu.

**Kural: prompt'un boyutu kod tabanının boyutundan bağımsız olmalı.**

`.github/scripts/kaynak-sec.mjs` dökümü ham nota göre ilgi sırasına dizer,
bütçe kadarını gönderir, kalanını **adıyla** listeler. Sıralama neyin önce
geleceğini söyler, bütçe nerede kesileceğini. Bütçe cömert tutulur (kod
tabanının yaklaşık yarısı): güvenlik sıralamanın zekâsından değil, payın
büyüklüğünden gelir — pay büyükse sıralama hatası kesime düşmez.

Sıralama beş katmandır: modelin kendi seçimi (yalnızca dosya listesi
gösterilerek yapılan ucuz bir çağrı), notta açıkça geçen dosya yolları,
tanımlayıcı eşleşmesi, arayüz dili köprüsü, düz metin. Üstüne bir sıçramalık
ithalat genişletmesi: seçilen dosyanın kullandığı tipler ve yardımcılar da
gider.

**Arayüz dili köprüsü** iki dilli projelerin ihtiyacıdır. Notlar ürünün
dilinde ("takvimde ay değiştirme"), kod İngilizce yazılır (`CalendarSheet`).
Hiçbir sözcük eşleşmez. Köprü çeviri dosyası üzerinden kurulur: nottaki
sözcük → o sözcüğü içeren çeviri metni → anahtarı → anahtarı kullanan dosya.
Ayırt etme nadirlikle ölçülür — "takvim" 461 çevirinin 3'ünde geçer ve güçlü
sinyaldir, "kaydet" onlarcasında geçer ve hiçbir şey söylemez.

Üç güvenlik valfi vardır ve üçü de bilerek sıralamanın dışındadır:

- **Notta adı geçen dosya asla kesilmez.** En yüksek puanı almakla kalmaz,
  bütçe kontrolünün önünde seçilir — puan sıralamayı belirler, seçimi değil;
  büyük bir dosya birinci sırada olsa da bütçe kontrolünde atlanabilir.
  Zorunlu dosyalar bütçeyi tek başına aşarsa kesim yine yapılmaz, aşım
  görünür biçimde raporlanır.
- **`KAYNAK_HER_ZAMAN`** — kök bileşen, ortak tipler, ana bağlamlar notla
  ilgisine bakılmadan gönderilir. Bunlar olmadan model doğru dosyayı görse
  bile yanlış yere bağlar.
- **Gönderilmeyen dosyalar adıyla listelenir**, "içeriğini görmediğin dosya
  hakkında kesin hüküm verme" notuyla. Kırpma görünür olmalı; görünmeyen
  kırpma, modelin olmayan bir şeyi yok sanmasıdır.

Hiçbir katman tutmazsa bütçe küçük dosyalardan doldurulur: kötü seçim, kör
seçimden iyidir. Model seçimi çağrısı düşerse iş **ertelenmez** — sezgisel
katmanlar tek başına çalışır.

**Bütçe, kodu okuyan her yola konur.** Bu hatta döküm dört yerde basılıyor:
triyaj, ürün yöneticisi, iç kontrol, revizyon. Düzeltme yalnızca triyaja
indiği için revizyon 1,2 MB'lık ham dökümü basmaya devam etti; her sahip
yorumunda üç kez sağlayıcı tavanına çarpıp adım sessizce öldü ve issue'ya tek
satır not düşmedi. **Sahibin yorumunun düşmesi, hattın yapabileceği en pahalı
hatadır** — onay kapısına gelen iş, sahibin söylediği şeyi içermiyordu.
Kural: prompt'a `cat` ile dosya basan her adım `kaynak-sec.mjs`'ten geçer.
Yeni bir prompt yolu açan, bütçesini de açar.

**Bütçe sıralamasız kesilmez.** Dosyaları bulundukları sırayla alıp bütçe
dolunca durmak, seçimi alfabeye bırakmaktır: ürün yöneticisi 191 dosyanın
alfabetik ilk 13'ünü okuyup `DayOfMonthGrid.tsx`'te duruyordu. Kesim ancak
ilgi sırasına dizilmiş bir listede anlamlıdır; sırasız kesim, kırpmanın en
kötü biçimidir çünkü hem eksiktir hem rastgeledir.

Ayarlar `.agentrc`'dedir (`KAYNAK_YOLLARI`, `KAYNAK_UZANTILARI`,
`KAYNAK_HARIC`, `KAYNAK_HER_ZAMAN`, `SOZLUK_DOSYASI`); script projeden
bağımsızdır ve yeni projeye değiştirilmeden kopyalanır.

**İç kontrol bütçesi 60 KB'dir (sahibin kararı, 21 Ağustos 2026).** Bu
bölüm "bütçe cömert tutulur" der; iç kontrolde istisna ölçülerek kondu. 150 KB
ile `kaynak-sec.mjs` 60 issue'nun 60'ında bütçeyi sonuna kadar doldurdu ve
mühendis çağrısına ayda ~$50 ekledi; 60 KB ile ek ~$12 ve üç ölçülmüş arıza
(sıfır kaynak, test sızıntısı, hayalet dosya adı) kapanıyor. Bütçe cömertliği
bir ilke, 60 KB bir ölçüm; ölçüm ilkeyi bu noktada yener. Her mühendis yorumu
kaç dosya gördüğünü altına yazar — "N dosya / M KB"; sayı düşükse yorum o
kadar kördür ve okuyan bunu bilmelidir.

## Yeni projeye taşıma

İki küme vardır; sınırı liste değil, dosyanın kendi `SINIF` satırı söyler.

**GENEL — değiştirmeden kopyalanır:** `docs/AGENT-WORKFLOW.md`,
`scripts/bootstrap-agents.sh`, `.github/scripts/llm.sh`,
`.github/scripts/kaynak-sec.mjs`, `.github/scripts/maliyet-topla.mjs`,
`tools/maliyet.sh` ve `.github/workflows/` altında `gemini-pm.yml`,
`gemini-triage.yml`, `gemini-revise.yml`, `gemini-synthesis.yml`,
`gemini-models.yml`, `internal-check.yml`, `pr-check.yml`, `pr-nanny.yml`,
`issue-sweeper.yml`, `pipeline-sweeper.yml`, `roadmap-keeper.yml`,
`maliyet.yml`.

Liste eksikse kurulum sessizce kusurlu başlar: `kaynak-sec.mjs` yoksa triyaj
`set -euo pipefail` altında ENOENT ile ölür. `scripts/bootstrap-agents.sh`
doğrulayıcısının ağı bu listeyle birlikte genişler.

**PROJE — her projede yeniden yazılır:** `CLAUDE.md`, `docs/PRODUCT-DNA.md`,
`docs/ROADMAP.md`, `docs/notes/` (boş başlar), `.agentrc`,
`.github/workflows/ci.yml`, `.coderabbit.yaml`. Bunlardan kopyalanan olsa olsa
iskelettir; içerik o projenindir.

1. GENEL kümeyi olduğu gibi kopyala
2. `docs/PRODUCT-DNA.md`'yi o ürün için yaz; `docs/ROADMAP.md`'ye yalnızca ürün
   paragrafını koy, **Fazlar bölümünü boş bırak** — fazları doğuş ritüelinde
   ürün yöneticisi taslar, sen onaylarsın
3. `docs/notes/` dizinini boş başlat — notlar buraya, her biri kendi
   dosyasına yazılır (tek dosya çakışma yüzeyidir, aşağıya bakınız)
4. `CLAUDE.md`'yi o projenin kuralları ve **doğrulama komutlarıyla** yaz.
   Birleşme sonrası insan adımı gerektiren bir kural varsa (migration gibi)
   onu da buraya yaz — ürün yöneticisi projeye özel kapıları buradan okur
5. `.agentrc`'ye kaynak yollarını ve uzantılarını yaz — workflow'lar kaynak
   dökümünü buradan okur; dosya yoksa varsayılana düşer ve uyarır
6. `.github/workflows/ci.yml`'i o projenin araç zinciriyle yaz — lint ve
   derleme her PR'da koşmalı, kesin hüküm CI'dan gelir
7. `.coderabbit.yaml`'a o projenin denetim kurallarını yaz; `drafts: true`
   kalsın — taslak PR'lar denetimin dışında kalmamalı
8. **En az iki sağlayıcı anahtarı tanımla:** `gh secret set GEMINI_API_KEY`
   ve `gh secret set ANTHROPIC_API_KEY`. Metin üretimi `llm.sh` üzerinden
   geçer. İkinci anahtar **kendiliğinden devreye girmez** — devralma
   `LLM_YEDEK=1` ile açıkça açılır; varsayılan davranış işi ertelemektir
   (yukarıda "Tek metin kapısı"). İkinci anahtar, acele bir iş için o düğmeye
   basılabilsin diye tanımlanır. Modeller repo
   değişkenlerinden seçilir: `GEMINI_MODEL`, `CLAUDE_ARCHITECT_MODEL`
   (güçlü model — estetik yargı), `CLAUDE_CHECK_MODEL` (ucuz model — teknik
   denetim), `CLAUDE_FALLBACK_MODEL`. Koda hiçbir model adı gömülmez
9. **Depo public değilse Actions dakikası satın alınmış olmalı.** Ücretsiz
   kota bittiğinde her job iki saniyede, runner atanmadan, sıfır adımla düşer
   — kod hatası gibi görünmez, hiçbir log da üretmez. Hattın tamamı sessizce
   durur
10. `scripts/bootstrap-agents.sh` çalıştır — etiketleri kurar, dosyaların
   sınıflarını ve eksik ayarları raporlar
11. Zamanlanmış mühendis ajanını kur (aşağıda)

Doğrulama komutları projeye göre değişir (`npm run build`, `swift build`,
`cargo test`, `godot --headless`). Bunlar **`CLAUDE.md`'de** tanımlanır; iş
akışı YAML'ında değil.

### Mühendis ajanı — dosyayla taşınmaz, elle kurulur

Mühendis hiçbir workflow dosyasında yaşamaz; repoya bağlanabilen zamanlanmış
bir kod ajanıdır. Kurulum talimatı şunları içermek zorundadır — eksiği ölü
direktif üretir:

1. **Ne okur:** önce `CLAUDE.md`, sonra `docs/AGENT-WORKFLOW.md`. Kurucu
   ilkeler onun görev tanımıdır
2. **Hangi aralıkla koşar:** saatte bir yeterlidir. Boş koşu ucuzdur; iş yoksa
   dal açmadan durur
3. **Her koşuda önce bakım:** açık PR'larında karşılanmamış inceleme bulgusu
   ve birleşemez dal arar; çakışmayı `main`'i dala birleştirerek onarır
4. **Sonra iş seçimi:** `agent-ready` etiketli, `sende` taşımayan, son
   saatlerde "üzerinde çalışıyorum" yorumu almamış issue'lardan en küçük
   numaralıyı alır; `acil` etiketli olan sırayı öne geçer. Başlarken issue'ya
   "üzerinde çalışıyorum" yorumu bırakır
5. **Nasıl teslim eder:** `issue-N-` önekli dalda çalışır, `Closes #N` atıflı
   **taslak PR** açar, `CLAUDE.md`'deki doğrulama komutlarını koşturur,
   bitiremediğini PR açıklamasında söyler

## Maliyet disiplini — hattın en pahalı hatası tetikleyicidir

Bu bölüm üç kez üst üste yakılan API kredisinin bedeliyle yazıldı. Her
seferinde suçlu model seçimi sanıldı; her seferinde **tetikleyici** çıktı.

**Ölç, sonra karar ver.** Her oturumun başında koşu sayımını al:

```sh
for w in "<workflow adları>"; do
  gh run list --workflow "$w" --limit 100 --json createdAt \
    --jq "[.[] | select(.createdAt > \"$(date -u -v-3H +%Y-%m-%dT%H:%M)\")] | length"
done
```

Bir iş akışı **saatte 3-5 koşuyu** geçiyorsa tetikleyicisi bozuktur. Sayı
vermeden model değiştirmek, yanlış yeri onarmaktır.

**Beş kalıcı kural:**

1. **`synchronize` neredeyse her zaman yanlıştır.** Mühendis bir PR'a
   onlarca düzeltme push'u atar; her push'ta tam diff'i yeniden denetlemek
   aynı işi onlarca kez ödemektir. Denetim PR'ın **incelemeye çıkışında** bir
   kez koşar; sonraki push'ları denetçi zaten izler. Ölçülen fark: 19
   koşu/saat → 0,7 koşu/saat.
2. **Olay yağmuru tek koşuya toplanır.** Ürün yöneticisi gibi olayla uyanan
   ajanlarda `cancel-in-progress: true` ve bir **debounce** (son başarılı
   koşudan bu yana N dakika geçmediyse atla) şarttır. Mühendis bir turda beş
   PR kapatıyorsa, beş kez aynı repo durumu analiz edilir.
3. **Bağlam bütçelidir.** Kaynak dökümü ve yalnızca-ekleme belgeler sinsice
   büyür; bir gün 264 bin token'a çıkıp modelin penceresini aşar. Döküme
   bayt bütçesi konur, notların yalnızca son bölümü verilir, şartnamenin
   andığı dosyalar hedeflenir. Kırpma **görünür** olmalı — sessiz eksik,
   yanlış hükümden kötüdür.
4. **Rol başına model.** Estetik yargı güçlü model ister (ucuz model
   uydurur ve biçim kuralını dinlemez); teknik denetim hedefli bağlamla ucuz
   modelde yeterlidir. Tek model her role dayatılmaz.

5. **Sayacın kendisi de sınanır.** Ölçüm aracı sessizce bozulursa ölçtüğü her
   şey "sıfır" görünür ve bu, sorunun yokluğundan ayırt edilemez. İki alt
   kural: her metin üretimi `llm.sh`'ten geçer — doğrudan `curl` atan adım
   defterde hiç yoktur, ve bu hatta tam olarak en pahalı iki yol (iç kontrol,
   PR denetimi) böyle kayboldu. İkincisi: **defterin sıfır göstermesi bir
   alarmdır, bir sonuç değil.** Koşan bir hatta "$0.00 / 0 çağrı" yazan pano,
   hattın bedava olduğunu değil sayacın kırık olduğunu söyler.

6. **Kusur ile fiyat ayrı şeylerdir.** 21 Ağustos 2026'da aynı araç iki kez
   para yaktı ve iki sebep farklıydı. İlkinde suç tetikleyicideydi ve
   düzeltildi. İkincisinde tetikleyici doğruydu, sayaç doğruydu, aynı commit
   iki kez denetlenmiyordu — ve para yine gitti, çünkü aracın kendisi
   pahalıydı: denetim başına 23.000 çıktı token'ı, neredeyse tamamı düşünme.
   Bir aracın kendisi pahalıysa ayar çekerek ucuzlatılmaz; **ne zaman
   çağrılacağına karar verilir.** Pahalı denetçi yalnızca elle çağrılır ve
   bedeli parayla ölçülmeyen farklar için saklanır: migration, yetki, para
   aritmetiği. Rutin denetim, parası zaten ödenen araçlarda kalır.

7. **Sayacın kapsamı, para harcayan her yolun kapsamıdır.** Sayaç aylık iki
   dolar derken sağlayıcı konsolu altmış dolar diyordu. Fark tahmin hatası
   değil kapsam hatasıydı: iki iş akışı sağlayıcıyı `llm.sh` üzerinden değil
   doğrudan çağırıyordu ve maliyet satırı oradan hiç geçmiyordu. Aynı
   körlüğün ikinci kılığı danışman aracında: danışmanın token'ları üst düzey
   `usage` alanlarına dahil değil, `usage.iterations[]` içinde ayrı bir türle
   duruyor. Yalnızca üst düzeye bakan bir sayaç onu görmez. Kural şu:
   **ölçülmeyen harcama, olmayan harcama gibi görünür.** Sağlayıcıya giden
   her çağrı, hangi yoldan giderse gitsin, deftere yazar; yazmayan yol bir
   gün bulunur ve o gün fatura çoktan kesilmiştir.

8. **İki denetçinin sebebi fazlalık değil, birbirlerinin körlüğüdür.** Tek
   dış denetçi kotaya takıldığında commit durumunu `success` yazıp hiç
   bakmıyordu ve son on PR'ın ikisi öyle birleşti. İkinci bir dış denetçi
   eklendi; ikisinin de parası zaten ödeniyor. Biri susarsa öbürü konuşur, ve
   **yeşil tik artık tek bir kotanın insafında değildir.** Yanıltıcı yeşil
   yine de görünür kılınır: açıklaması "kota" diyen bir `success`, PR'ın
   üstüne not düşer.

**Denetçinin de kotası vardır.** Taslak PR'da denetçi çağrılmaz: mühendis
üzerinde çalışırken her push zaten artımlı inceleme doğurur, üstüne bakıcı da
çağırırsa bir iş on beş-yirmi inceleme tüketir ve kota hattın hızının altında
kalır.

## Bilinen tuzaklar — bir kez düşülür, iki kez düşülmez

Hepsi bu hatta yaşandı; her biri saatler yedi.

- **Botun koyduğu etiket olay doğurmaz.** `GITHUB_TOKEN` ile eklenen etiket
  `issues: labeled` tetiklemez. Zincirin bir sonraki halkası ya
  `workflow_dispatch` ile açıkça çağrılır ya da hiç koşmaz. Her otomatik
  etiket geçişinin yanında bir dispatch olmalı.
- **`grep` + `set -euo pipefail` sessiz katildir.** Eşleşme bulamayan `grep`
  1 döndürür ve script'i öldürür; adım "hata" der ama hiçbir mesaj bırakmaz.
  Beklenen boş sonuçlarda `|| true` şarttır.
- **Düşünen modeller ilk blokta metin döndürmez.** `content[0].text` boş
  gelir; metin `type == "text"` filtresiyle ayıklanır. Ayrıca düşünme
  bütçeyi tüketip metinsiz yanıt bırakabilir — boş yanıt akışı düşürmemeli.
- **Model çıktısı boş satırla ya da kod çitiyle başlayabilir.** Başlık "ilk
  satır" değil **ilk dolu satır**dır; yoksa `title can't be blank` ile koşu
  düşer.
- **Karar da ilk satırdan okunmaz.** Aynı kural çıktıdan okunan her karar için
  geçerlidir. `head -1 | grep -oE 'REVIZE|AYNEN' || echo AYNEN` çıktı bir kod
  çitiyle başladığında sessizce varsayılana düşer: gövde yazılmaz ama yorum
  "işledim" der ve iş onaya gider. Eşleşmeyen çıktı varsayılana düşmez, adımı
  düşürür — sessiz varsayılan, kırmızı koşudan kötüdür.
- **`permissions:` bloğu yazan, yazmadığı kapsamı kapatır.** Blok repo
  varsayılanını genişletmez, daraltır. `gh workflow run` hem `actions: read`
  hem `actions: write` ister; yoksa dispatch 403 alır ve `|| true` yüzünden
  koşu yeşil biter. Zincirin halkası kopar, kimse görmez — yalnızca süpürücü
  çeyrek saat sonra toparlar. Her `gh workflow run` satırının yanında izin
  satırı olmalı.
- **Script'in arayüzü değişirse çağıranlarının hepsi değişir.** Maliyet
  toplayıcısı konumsal argümandan `--bayrak`'a geçti; yerel yol güncellendi,
  iş akışı unutuldu. Tanınmayan argümanlar sessizce yok sayıldı, script boş
  girdiyle **0 dönerek başarıyla** bitti ve defter sonsuza kadar sıfır
  gösterecekti. Bir script'i iki yerden çağırıyorsan, arayüzünü değiştiren
  commit ikisine birden dokunur.
- **`concurrency` grubu olaya özel olmalı.** Hat başına tek grup işleri sıraya
  sokmaz, düşürür: GitHub bir grupta yalnız bir bekleyen koşu tutar. Cron'la
  tekrar koşan işlerde zararsızdır. Ama tek seferlik ve olaya özgü yük taşıyan
  işlerde — birleşen PR'ın gövdesini okuyan harita bekçisi gibi — düşen
  koşunun taşıdığı iş bir daha hiç işlenmez. Grup anahtarına issue ya da PR
  numarası konur.
- **Bakıcının push'u CI doğurmaz.** `GITHUB_TOKEN` ile atılan push yeni iş
  akışı koşusu tetiklemez. Bakıcı çakışmayı tabanı birleştirerek onarıp push
  ettiğinde PR'ın yeni SHA'sında hiçbir durum kontrolü koşmaz: PR "bayat
  yeşil" değil, **boş** görünür. Otomatik onarım push'undan sonra CI açıkça
  dispatch edilmelidir.
- **YAML geçerli, kabuk kırık olabilir.** Gömülü `run:` blokları YAML
  doğrulamasından geçer ama bozuk bir tırnak günlerce fark edilmez. CI, her
  workflow'un her `run` bloğunu `bash -n`'den geçirmelidir.
- **Belgeler PR'ların çakışma yüzeyidir.** Ölçüldü: son on beş PR'ın on
  dördü yol haritasına dokunuyordu. Notlar ayrı dosyalara bölünür, haritayı
  tek bir bekçi yazar.
- **Depo ile veritabanı arasında kayıt bağı yoksa** ajan uygulanmış
  migration için tekrar tekrar iş açar. Uygulananların tek bir kaydı olmalı.

- **Önbellek bir tasarruf aracı değil, hacme bağlı bir bahis.** Yazım girdi
  fiyatının 1,25 katı (5 dk) ya da 2 katı (1 saat); kazanç yalnızca okumadan
  gelir. 22 Ağustos 2026'da bir gün açık tutuldu ve defter yazdı: 90.586 token
  yazıldı, **sıfır** okundu — net zarar. Sebep tasarımdı: önbelleklenen önek
  issue'ya özel kaynak dökümünü içeriyordu, ve aynı issue'nun tekrarı da
  parmak izi kapısıyla zaten engellenmişti. **İki optimizasyon birbirini
  yiyebilir**; tekrarı kesen bir kapı, tekrardan beslenen bir önbelleği
  anlamsız kılar. Açmadan önce şu sorulur: aynı önek, TTL penceresi içinde,
  gerçekten ikinci kez gidecek mi? Cevap ölçülmeden "evet" sayılmaz.

- **Danışman aracı (advisor) beş yerden ısırır.** (1) Araç tanımındaki
  `max_tokens` ayrı bir şeydir; üst düzey tavan yürütücüyü sınırlar, danışman
  tavansız kalırsa çağrı başına 4-6 bin token düşünür. 2048 ile başlanır.
  (2) Tek turluk bir işte yürütücü danışmanı **hiç çağırmayabilir**; o zaman
  ucuz model tek başına koşmuş olur ve kimse fark etmez. Ya `tool_choice` ile
  zorlanır ya da sistem istemiyle yönlendirilir; rapor çağrı sayısını yazar.
  (3) Faturası `usage.iterations[]` içinde `advisor_message` türüyle durur,
  üst düzey `usage`'a girmez. (4) Opus 5 ve Fable 5 danışmanların tavsiyesi
  **şifreli** döner; yürütücü okur, biz okuyamayız. Tavsiyeyi denetlemek
  gerekiyorsa düz metin dönen bir danışman seçilir. (5) Danışmanın kotası,
  o modele doğrudan yapılan çağrılarla aynı kovadan düşer; kota dolunca hata
  istek içinde `too_many_requests` olarak görünür, istek düşmez.
  Belge: platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool

- **Tavanda kesilen çağrı da faturalanır.** `max_tokens`'a çarpan bir
  çağrı tavan kadar çıktı token'ı öder ve hiçbir şey üretmez. Maliyet satırı
  "işe yaradı mı" kontrolünden **önce** yazılır; sonra yazılırsa tam da en
  pahalı arıza defterde görünmez. 21 Ağustos'ta on koşu, 184.000 token,
  defterde sıfır satır.

- **Düşünme tavanı yer — ve kısılmaz.** Düşünen modellerde `max_tokens`
  metni değil, düşünme artı metni sınırlar. Görünen hüküm yarım sayfa, fatura
  23.000 token olabilir. Kural 6 ile çelişir gibi duran nokta şuradaydı:
  "düşünme kısılır" mı, "çağrı anı seçilir" mi? Sahibin kararı (21 Ağustos
  2026): **düşünme kısılmaz.** Tavan düşünmeye göre boyutlanır, efor kolu
  görünür ve tek yerden ayarlanır ama `high`ta kalır; tasarruf, pahalı
  modelin **ne zaman çağrıldığından** gelir — aynı şartname sürümü ikinci
  kez denetlenmez, duyuya dokunmayan farka mimar çağrılmaz. Bu, kural 6'nın
  harfiyen uygulanmasıdır, istisnası değil.

- **Görsel üreten model PNG istense de JPEG dönebilir.** Dosya uzantısı
  `mimeType`'tan okunur; yanlış uzantılı dosya bazı görüntüleyicilerde hiç
  açılmaz ve arıza "görsel üretilmedi" sanılır.

- **Cloudflare istemci imzasına bakar.** Supabase yönetim API'sine `urllib`
  ile gidilirse 1010 döner; `curl` geçer. Boyutla ilgisi yok. SQL bölücü de
  blok yorumunu (`/* */`) tanımak zorunda, yoksa yorum içindeki noktalı
  virgül dosyayı yorum parçalarına böler ve hepsini SQL sanır.

## Bilinen sınırlar

- Bulut ajanının mobil derleme ve simülatörü yoktur; görsel doğrulama insanda
  kalır
- Tarayıcıda çalışan sohbet modelleri repoya bağlanamaz — ürün yöneticisi ancak
  API üzerinden gerçek aktör olur
- Denetçinin ücretsiz katmanı genelde açık kaynak repolarla sınırlıdır

## Merkez doktrin değişirse: her projenin temsilcisi sınar

Bu hat birden çok projenin paylaştığı bir merkezde duruyor
(`Aftermathy/hat-doktrini`) ve projeler onu sürüm etiketiyle çağırıyor
(`@v1`). Tek kopyanın kazancı açık: bir projede öğrenilen ders ötekilere
geçiyor. Bedeli de açık ve kural bu bedeli karşılamak için var:
**merkeze giren bozuk bir değişiklik aynı anda bütün projeleri kırar.**

Sahibin kuralı (12 Eylül 2026):

> her projenin bir temsilcisi bunu kontrol etmesi gerek, kendi projelerine
> sorun çıkarıp çıkarmayacağını — bence lokaller yapabilir

### Kim sınar

Her tüketici projenin **yerel ajanı** (`lokal` etiketli işleri çözen aktör).
Bulut mühendisi değil: merkez deposu ürün kuyruğunun dışında ve yerel ajan
projenin gerçek ortamında koşuyor — CI'sını, anahtarlarını, zamanlanmış
işlerini görebiliyor.

### Nasıl sınanır

1. **Değişiklik merkeze PR olarak gelir.** Doğrudan `main`'e itilmez; `v1`
   etiketi de değişiklik onaylanmadan oynatılmaz.
2. PR, tüketici projelerin listesini taşır ve her biri için bir onay satırı
   açar.
3. Her projenin yerel ajanı, değişikliği **kendi deposunda** sınar: sarmalayıcı
   dalı geçici olarak `@main`'e çevirip bir tur koşturur, sonucu merkez PR'ına
   yazar ve dalı geri alır.
4. Tüketicilerin hepsi geçti derse merkez birleşir ve **yeni sürüm etiketi**
   atılır (`v2`). Projeler kendi ritminde yükseltir.

### Neden sürüm etiketi şart

`@main` ile çağıran bir proje, merkezdeki her commit'i anında alır — yani
başka bir projenin denemesi bu projeyi kırabilir. Etiket bunu keser: değişiklik
merkeze inse bile proje `@v1`'de kaldığı sürece etkilenmez.

### Sınanmadan geçen tek şey

Belgeler (`docs/`) ve yorumlar. Onlar iş akışı çözümlemesine girmiyor; bir
yazım düzeltmesi için üç projeyi turlamak, kuralın kendi maliyetini aşardı.
Ölçüt şu: **çalışma zamanını değiştiren her şey sınanır.**
