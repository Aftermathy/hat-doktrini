# Denetçi Mimarisi

Projeden bağımsız doktrin. Bir sonraki programa **olduğu gibi** taşınır; bu
belgenin içinde Vault'a özel hiçbir kural yoktur, yalnızca Vault'ta ölçülmüş
sayılar ve Vault'ta düşülmüş tuzaklar vardır. Ölçüm taşınmaz, ders taşınır.

`docs/AGENT-WORKFLOW.md` hattın **yazar** tarafını anlatır: kim iş açar, kim
şartname yazar, kim kod yazar. Bu belge **denetçi** tarafını anlatır: yazılanı
kim okur, hangi hükmü kime yazar, o hüküm kapıya nasıl bağlanır ve neye mal
olur. İki belge çakışırsa iş akışının kendisi kazanır; burası onun üstüne
kurulur, yerine geçmez.

---

## 1. Neden birden fazla denetçi

Hattın kendi yazdığı prompt'u denetleyen bir model, prompt'a yazılmış kör
noktaları göremez. Bu bir yetenek sorunu değil, bilgi sorunudur: denetçiye
"şu diff'i incele" derken ona neyi incelemesi gerektiğini de söylüyorsun, ve
söylemediğin şey onun için yoktur. Prompt'ta "para aritmetiğine dikkat et"
yazıyorsa para aritmetiği denetlenir; "zaman dilimi" yazmıyorsa zaman dilimi
kusuru diff'in ortasında durur ve hiç kimse ona bakmaz. Tek denetçili bir
hatta bu kusur, prompt bir gün düzeltilene kadar görünmez kalır.

İkinci denetçinin değeri, ikinci bir görüş vermesi değil, **farklı bir
prompt'tan bakmasıdır**. Bu depoda bağımsızlık üç ayrı katmanda kuruluyor ve
üçü birbirinin yerine geçmiyor:

- **Model ailesi ayrımı.** Kodu Gemini yazıyor, denetimi Claude yapıyor.
  `.github/scripts/llm.sh` bunun için `LLM_SAGLAYICI` değişkenini taşıyor:
  değişken `claude` ya da `gemini`ye sabitlendiğinde birinci sağlayıcı
  düşerse **yedeğe düşülmez, iş ertelenir**. Sıranın sessizce bozulması
  bağımsızlığı da sessizce yok eder — ve bu varsayımsal bir tehlike değil:
  `GEMINI_MODEL` bir önizleme modeline bağlıyken her Gemini çağrısı düşmüş,
  yedek kusursuz devralmış ve hattın tamamı **haftalarca** Claude üzerinde
  koşmuştu. Arıza faturadan başka hiçbir yerde görünmedi.
- **Prompt ayrımı.** Aynı model ailesi içinde bile roller ayrı prompt okur:
  `internal-check.yml` mühendis ve mimarı ayrı matris kollarında koşturuyor,
  `pr-check.yml` mimar ve ürün yöneticisini koda bakmaya çağırıyor. Mühendis
  teknik gerçekliğe, mimar deneyime, ürün yöneticisi şartnameye sadakate
  bakıyor. Üçü aynı diff'e bakar ama üçü farklı sorular sorar.
- **Hat dışı denetçi.** CodeRabbit hattın prompt'larını hiç görmez. Onun kör
  noktaları bizim kör noktalarımızla ilişkisiz — asıl bağımsız olan budur.

### Bağımsızlığın sınırı

Bağımsızlık sonsuza kadar ölçeklenmez ve üç yerde biter:

1. **Aynı diff, aynı çerçeve.** Her denetçi aynı diff'i, aynı `-U15`
   bağlamıyla okuyor. Diff'in dışında kalan kusur hiçbirine görünmez. Beş
   denetçi eklemek bu sınırı hiç oynatmaz.

   Bu sınırın bir zamanlar çok daha dar bir hâli vardı ve **kaldırıldı**:
   denetçiler diff'in yalnız ilk 12 KB'ını okuyordu. 12 Eylül 2026'da NVIDIA
   kolu bölmeye geçti (aşağıda). Claude kolu (`denetci.yml`) hâlâ kesiyor;
   elle çağrıldığı için acele değil, ama aynı ölçüm oraya da taşınmalı.
2. **Mutabakat kanıt değildir.** Üç denetçi aynı şeyi söylediğinde bu üç kez
   doğrulanmış bir bulgu değil, tek bir korelasyondur: hepsi aynı bariz
   satıra bakmıştır. Denetçi sayısı bulgu **kapsamını** genişletir, bulgunun
   **güvenilirliğini** artırmaz. Kesin hüküm CI'dan gelir; denetçi hükmü
   dikkat çağrısıdır.
3. **Denetçi sayısı gürültüyü de çoğaltır.** Dört denetçinin dördü de PR'a
   yorum yazarsa sahip hiçbirini okumaz. Kapıya bağlanan **tek** bir hüküm
   olmalı; ötekiler o kapının altında görüş bildirir. Bu depoda o hüküm
   `Denetci` commit durumudur ve onu yalnızca `denetci.yml` yazar. Öteki
   durumlar ayrı bağlam dizeleri taşıyor ve `Denetci`nin üstüne yazmıyor:
   `CodeRabbit`, `Denetci (NVIDIA)`, ve yalnız toplu sunum PR'larında
   `toplu-pr.yml`in yazdığı `Sunum CI` ile `Sunum denetimi`. Ayrım bağlam
   dizesinde kuruluyor; iki denetçi aynı dizeyi yazsaydı sonraki, öncekinin
   hükmünü sessizce silerdi.

---

## 2. Bugünkü düzen

Beş ayrı denetim yüzeyi var. Hepsi denetçi değil — ikisi şartnameye, ikisi
koda, biri kapıya bakıyor.

| Denetçi | Dosya | Ne zaman | Neye bakar | Hüküm nereye |
|---|---|---|---|---|
| Denetçi (Claude) | `.github/workflows/denetci.yml` | Yalnızca elle (`workflow_dispatch`) | Migration, RLS, para aritmetiği, yetki | `Denetci` commit durumu |
| PR iç kontrol | `.github/workflows/pr-check.yml` | `ready_for_review` | Deneyim ve şartnameye sadakat — **niyet** | PR yorumu |
| İç kontrol | `.github/workflows/internal-check.yml` | `internal-check` etiketi | Şartname: teknik gerçeklik + deneyim | Issue yorumu |
| CodeRabbit | `.coderabbit.yaml` | Her PR, taslak dahil | Rutin doğruluk | `CodeRabbit` commit durumu |
| Denetçi (NVIDIA) | `.github/workflows/denetci-nvidia.yml` | `opened`, `ready_for_review`, `reopened` ve elle | Rutin doğruluk — CodeRabbit'in ucuz eşi | `Denetci (NVIDIA)` commit durumu |

**Gemini'nin dört rolü denetçi değildir.** `gemini-pm.yml`, `gemini-triage.yml`,
`gemini-revise.yml`, `gemini-synthesis.yml` işi **üretir**: sıradaki görevi
açar, ham notu şartnameye çevirir, sahibin yorumuna göre şartnameyi yeniden
yazar, iç kontrol görüşlerini tartıp onaya çıkarır. Bunlar yazar tarafıdır ve
bu belgede yalnızca **denetlenen** taraf olarak geçerler. Sentez adımı
denetçilerin görüşünü tartar, bu onu denetçi yapmaz — kendi ailesinin yazdığı
şartnameyi kendi tartıyor olması tam da 1. bölümdeki sorundur, ve bu yüzden
görüşü yazan iki göz ayrı bir model ailesinde koşuyor.

### Hangisi ne işe yarıyor

- **`denetci.yml` kapıdır, rutin değildir.** Otomatik tetikleyicisi yok ve bu
  bir eksiklik değil, karar: bir denetim ortalama 23.000 çıktı token'ı
  harcıyor ve neredeyse tamamı düşünme bloklarından geliyor — PR başına
  0,35-0,40 $. Hattın hızında bu, meşgul bir oturumda saatte 5 $ demek.
  21 Ağustos'ta iki kez, toplam ~12 $ böyle gitti. İlk seferinde suç
  tetikleyicideydi (`synchronize`, iki saatte 41 koşu); ikinci seferinde
  tetikleyici düzeltilmişti ve para yine gitti. **Bir aracın kendisi
  pahalıysa onu ayarlayarak ucuzlatamazsın, ne zaman çağıracağına karar
  edersin.**
- **`pr-check.yml` doğruluğa değil niyete bakar.** CodeRabbit "bu kod doğru
  mu" diye sorar; bu iş akışı "bu kod istenen işi mi yapıyor" diye sorar.
  İkisi ayrı sorudur ve doğru kod yanlış işi yapabilir.
- **`internal-check.yml` kapıdan önce durur.** Kusurlu şartnameyle
  başlayan iş, kusursuz denetlense bile yanlış işi bitirir. En ucuz denetim,
  kod yazılmadan önce yapılanıdır.
- **CodeRabbit rutini taşır ve kotası doludur.** Kota sınırına takıldığında
  commit durumunu `state: success` / `description: "Review rate limited"`
  diye yazıyor: yeşil bir tik, hiç başlamamış bir incelemeyi temsil ediyor.
  Ölçüldü — bir dönemde son on PR'ın ikisi (#341, #349) hiç incelenmeden
  yeşil birleşti, yani %20. Üst plan (Pro Plus) saatlik sınırı 5'ten 10'a
  çıkarıyor ama sıfırlamıyor: satın alarak hafifler, kapanmaz.
- **NVIDIA kola bağlandı, kapıya değil.** `denetci-nvidia.yml` her PR'da
  koşuyor ve hükmünü `Denetci (NVIDIA)` bağlamına yazıyor. Bu satırın
  denetlendiği gün dosya henüz birleştirilmemişti; birleşene kadar tablodaki
  "ne zaman" sütunu dosyanın kendi `on:` bloğunu anlatır, hattın bugünkü
  davranışını değil. Kolun *kapı* olup olmayacağı — birleşmeyi engelleyip
  engellemeyeceği — 6. bölümdeki karşılaştırmayı bekliyor. Anahtar koşuda
  yoksa (secret tanımsız, ya da PR bir fork'tan geliyor) kol `failure` yazıp
  PR'a not düşüyor: yeşil bir tik değil, açıkça hükümsüzlük.

### Bölme: denetimin kapsamı

**Ölçülen arıza.** `denetci-nvidia.yml` diff'in ilk 12 KB'ını okuyup gerisini
atıyordu. #741'de fark 143 KB'tı ve denetlenen 11.924 bayttı — **%8,3**. PR
yeşil hüküm aldı. Yeşil tik "bu kodu okudum, kusur bulmadım" demek; orada
söylediği şey "bu kodun on ikide birini okudum" idi, ve aradaki fark yorumun
dibindeki tek satırlık bir nota gömülüydü.

**12 KB'lık duvar kaldırılamıyor.** Ölçüldü: 12.000 baytlık dilim tamamlanıyor
(165 sn, 6.740 çıktı token); 24.589 baytlık dilimde uç nokta **hiç cevap
vermiyor** — iki denemede de boş yanıt, bağlantı beş dakika sonra cevapsız
kapanıyor. Yani arıza "tavan yetmiyor" değil ve tavanı yükseltmek açmıyor.

**Çözüm duvara birden çok kez çarpmak.** Fark 12 KB'lık dilimlere bölünüyor,
her dilim ayrı bir çağrıyla denetleniyor, bulgular sonda birleştiriliyor.
Kesim yeri rastgele değil: bayt sınırından kesmek bir hunk'ı ikiye bölerdi ve
yarım hunk denetlenemez — bağlam satırları bir tarafta, değişiklik öbür
tarafta kalır.

| kesim yeri | ne zaman | ne olur |
|---|---|---|
| dosya (`diff --git`) | varsayılan | başlık her dilimde yeniden yazılır |
| hunk (`@@`) | dosya tek dilime sığmıyorsa | hunk bütün kalır |
| satır | **tek bir hunk 12 KB'tan uzunsa** | `[PARCA n/m]` işaretiyle bölünür |

Üçüncü satır ölçümle girdi: bütün bir dosyayı yeniden yazan bir değişiklik
`-U15` altında **tek hunk** üretiyor ve o hunk 64 KB olabiliyor. Hunk sınırı
orada kesmiyor. 985 KB'lık gerçek bir fark üzerinde sınandı: 104 dilim, hiçbiri
tavanı aşmıyor, ve kaynaktaki **sıfır** satır kayboluyor.

**Canlı ölçüm (12 Eylül 2026, Vault PR #764).** 131.423 baytlık gerçek ve çok
dosyalı bir fark üzerinde: **14 dilim, 14'ü de hüküm verdi**, toplam ~15 dakika
(≈50 sn/dilim), 76 bulgu. Eski davranış aynı farkın ilk 11.924 baytını okurdu —
**%9,1**.

İki sayı buradan düzeltildi: dilim başına süre, dosyanın kendi yorumundaki 165
sn'lik eski ölçümün **üçte biri** çıktı. Yani 20 dilimlik bir denetim ~17 dakika,
`SURE_TAVAN`ın (45 dk) çok altında — iki kelepçeden **dilim tavanı** önce bağlıyor
ve bu doğru sıra: belirlenimci kelepçe `success` + kapsam yazıyor, rastlantısal
olan `error`. Ters sırada olsaydı büyük bir PR süre aşımına düşüp sürekli
beklemeye girerdi.

Bulgu kalitesi de aynı koşuda görüldü: sınama dalı punto jetonlarının
(`text-body`, `text-note`) keyfi piksel değerleriyle ezildiği eski sürümü geri
koyuyordu ve denetçi tam o ihlali yakaladı — o ölçek `punto-skalasi.test.ts` ile
donmuş durumda.

**İki kelepçe var ve ikisi ayrı şeyi ölçüyor.**

| kelepçe | değer | aşılırsa |
|---|---|---|
| `DILIM_TAVAN` | 20 dilim (≈240 KB) | `success`, ama okunmayan dosyalar **adlarıyla** yazılır |
| `SURE_TAVAN` | 2700 sn | `error` — yeniden çalıştırmak açabilir |

Ayrım şu soruya göre: **yeniden çalıştırmak düzeltir mi?** Dilim tavanı
belirlenimci — 32 dilimlik bir fark yarın da 32 dilim olacak, `error` yazmak o
PR'ı sonsuza kadar bekletirdi ve büyük PR hiç birleşemezdi. Süre aşımı ve düşen
dilim rastlantısal — sağlayıcı hıçkırdı, aynı koşu yarın tamamlanabilir.

**Hüküm sırası:** engel her şeyin önünde. Bir dilimde gösterilmiş kusur, öteki
dilimlerin okunup okunmadığından bağımsız olarak kusurdur.

**Bölme kısmi görüş arızasını kapatmıyor, çoğaltıyor.** Ölçülmüştü (1–2 Eylül,
üç PR, sekiz bulgu): #644'te 3 bulgunun 1'i, #647'de 5'in 2'si, #652'de 5'in
**5'i** modelin görmediği yer hakkında yazılmıştı ve `ENGEL` hükmüne dönüşüp
yeşil PR'ları kilitlemişti. Eskiden kısmi görüş yalnız tavan aşıldığında vardı;
şimdi birden çok dilim üretilen **her** koşuda var. O yüzden "görmediğin yer
hakkında bulgu yazma" talimatı artık her dilimin prompt'unda duruyor, ve
`[PARCA]` işaretinin farkın kendi metni olmadığı ayrıca açıklanıyor — bu model
tam olarak böyle bir satıra "sözdizimi hatası" dediği için (#593).

**Bölmenin ödediği bedel: çerçeve her dilimde yeniden gönderiliyor.** Prompt'un
fark dışındaki payı — `CLAUDE.md`'nin ilk 200 satırı artı PR açıklaması — dilim
başına ~15 KB ve 14 dilimlik bir denetimde 14 kez gidiyor. Bu bilerek böyle:
kuralları sonraki dilimlerden çıkarmak, dilimleri **farklı ölçütlere göre**
yargılamak olurdu ve karşılaştırılamaz hükümler üretirdi. Ücretsiz uç noktada
bedel sıfır; Bitdeer fiyatıyla 14 dilimlik bir denetim ~0,08 $ — tekil PR
denetiminin hâlâ yirmide biri.

**Kapsam üç yere birden yazılıyor:** PR yorumu, koşu özeti, ve commit durumunun
açıklaması (`Denetlendi 18/20 dilim — engel yok`). Üçü tek yerden kuruluyor;
ayrı kurulsalardı biri bir gün ötekilerden farklı bir şey söylerdi, ve kapıya
bakan kişi çoğunlukla yalnız üçüncüsünü görüyor.

### Ölçülen NVIDIA uç noktası

Anahtar `NVIDIA_API_KEY` GitHub secret olarak tanımlı. Uç nokta
`https://integrate.api.nvidia.com/v1/chat/completions`, OpenAI uyumlu. Model
`nvidia/nemotron-3-super-120b-a12b`: 1M bağlam, function calling ve structured
output destekliyor. Ücretsiz katmanda çalıştığı ölçüldü; katmanın sınırı
ölçülmedi.

---

## 3. Maliyet tablosu — karar bu tablodan çıkıyor

Rakamlar 5 KB'lik gerçek bir iş akışı diff'i üzerinde ölçüldü. NVIDIA satırı
1826 girdi + 3458 çıktı = 5284 token'lık tek bir çağrının Bitdeer ortak uç
nokta fiyatına (0,10 $/M girdi, 0,95 $/M çıktı) vurulmuş hâlidir.

| Denetçi | PR başına | Kaynak | Not |
|---|---|---|---|
| CodeRabbit (plan üstü) | 1,25 $ | fiyat listesi | Plan içinde kotayla sınırlı |
| Claude denetçi (`claude-sonnet-5`) | 0,35-0,40 $ | ölçüldü, ~23.000 çıktı token | Maliyetin neredeyse tamamı düşünme bloğu; tekil bir koşuda ~0,41 $ ölçüldü |
| Copilot inceleme (kota sonrası) | 0,52 $ | ölçüldü, çarpan 13 | 22 Ağustos'ta rutinden çıkarıldı |
| NVIDIA (Bitdeer fiyatıyla) | ~0,0035 $ | 5284 token ölçüldü | Ücretsiz uç noktada 0 $ |

Aradaki fark 100 kattan büyük ve tam da bu yüzden kararı basitleştiriyor:
**rutin denetim ucuz denetçide, kapı pahalı denetçide.** Pahalı denetçiyi her
PR'a bağlamak hattın bir günlük çalışmasından çok tutar; ucuz denetçiyi kapıya
bağlamak ise, ucuz denetçinin hükmü zayıfsa, kapıyı hiç olmamış gibi yapar.

Bu tablo iki şeyi **söylemiyor** ve söylemediğini bilmek gerekiyor: ucuz
denetçinin bulgu kalitesi henüz ölçülmedi (6. bölüm bunun içindir), ve NVIDIA
ücretsiz katmanının sınırı ölçülmedi. Sınıra çarpılırsa Bitdeer'e düşülür ve
satır 0 $'dan 0,0035 $'a çıkar — yani karar değişmez.

**Taşınabilir kural:** denetçi seçimi bir fiyat kararıdır ve fiyat, hattın
kendi maliyet sayfasında görünür olmalıdır. Fatura 24 saat gecikmeli ve
sağlayıcı sitesinde durduğu için, ölçülmeyen harcama fark edilmez.

---

## 4. Akıl yürütme modelleriyle çalışırken

Nemotron bir akıl yürütme modeli ve **varsayılan olarak düşünüyor**. Aynı
5 KB'lik diff üzerinde ölçülen davranış:

| Ayar | Süre | Completion token | Sonuç |
|---|---|---|---|
| `chat_template_kwargs.enable_thinking: false` | 1 sn | 11 | "Değişiklik doğru. Kusur yok." — yüzeysel, işe yaramaz |
| `enable_thinking: true` + `reasoning_budget: 3000` | 38 sn | 3458 | Gerçek inceleme, ama model kendi kendisiyle tartışıyor |

Bu tablodan çıkan dört ders, hepsi ölçülmüş, hiçbiri yeniden ölçülmesin:

1. **`max_tokens` reasoning'i de kapsıyor.** İlk denemede `max_tokens: 2000`
   verildi ve reasoning çıktı bütçesini yedi: **hüküm hiç gelmedi**. Çağrı
   başarılıydı, tam bedelle faturalandı, sonuç sıfırdı. Reasoning ve content
   ayrı ayrı bütçelenmeli; tek sayı ikisini birden yönetemez.
2. **Denetçi `content` alanını okumalı, `reasoning_content`i değil.** Düşünme
   kapalıyken model `content`i dolduruyor; açıkken `reasoning_content` ayrı
   geliyor ve `content` **sonda** yazılıyor. Yanlış alanı okuyan bir
   entegrasyon, modelin kendi kendisiyle tartışmasını hüküm diye PR'a yazar.
3. **Düşünmeyi kapatmak modeli ucuzlatmaz, işlevsizleştirir.** 11 token'lık
   "kusur yok" bir hüküm değildir; onaylanmış görünen bir denetimsizliktir —
   CodeRabbit'in `success` yazan kota hatasının aynısı, bu kez kendi elimizle.
   Ucuz denetçi isteniyorsa küçük model seçilir, düşünme kapatılmaz.
4. **Boş `content` bir sağlayıcı arızası değildir.** Akıl yürütme modelinde
   tavanda kesilme, klasik modelin yarım metnine değil, **hiç metne**
   dönüşüyor. `llm.sh` bu ayrımı zaten taşıyor (çıkış kodu 2: "çağrı başarılı
   oldu ve çıktı tavanında kesildi") ve o ayrım burada daha da kritik: yarım
   metin gözle görülür, boş metin "sağlayıcı yanıt vermedi" gibi okunur ve
   yanlış tarafta — beklemede — çözüm aranır. Bu arızanın çözümü zamanda
   değil, girdinin boyutundadır.

**Taşınabilir kural:** akıl yürüten bir modeli hatta bağlarken üç sayı ayrı
ayrı yazılır — reasoning bütçesi, content bütçesi, ve toplamın tavanı. Üçü tek
sayıya indirildiğinde ilk kurban hükmün kendisi olur.

---

## 5. Kapı tuzağı — bir denetçiyi hatta bağlamanın iki gerçek arızası

Denetçiyi yazmak işin kolay yarısı. Zor yarısı, hükmünü kapıya bağlamak. Bu
depoda iki ayrı arıza yaşandı ve ikisi de taşınabilir ders bırakıyor.

### 5.1 Yazılmayan `statuses` yetkisi bir kapıyı günlerce sessizce geçirdi (#548)

`pr-nanny.yml` içindeki bakım işi commit durumunu okuyor ama `permissions`
bloğunda `statuses` hiç yazılmamıştı. **GitHub'da `permissions` bloğu yazan,
yazmadığı kapsamı kapatır** — varsayılana düşmez. Sonuç zinciri şöyle işledi:

`gh api .../commits/<sha>/status` 403 döndü → çağrı `2>/dev/null || echo ""`
ile yutuldu → `ACIKLAMA` boş kaldı → `case` boş dizeyi eşleştiremeyip
**sessizce `continue`** etti. 29 Ağustos'ta yedi PR'ın yedisi de
`Review rate limited` taşırken kapı hiçbirine not düşmedi ve **tek satır log
üretmedi**. Statü okuyan diğer iki akış (`denetci.yml`, `toplu-pr.yml`) bu
kapsamı zaten yazıyordu; eksik olan yalnız buydu.

Taşınabilir dersler:

- Bir iş akışı `permissions` yazıyorsa, o akışın **her** API çağrısının
  istediği kapsam listede olmalı. Bir kapsamın başka bir dosyada yazılı olması
  bu dosyada yazılı sayılmaz.
- `2>/dev/null || echo ""` kalıbı bir yetki hatasını "veri yok"a çeviriyor.
  Sessizleştirilen hata, olmayan hata gibi görünür.
- **Eşleşmeyen tur ile düşen sorgu ayrı satır basmalı.** Ayırt edilemeyen
  arıza aranmaz — bu kolun kendisi günlerce arızalıydı ve teşhis edilemedi,
  çünkü her iki durum da aynı sessizliği üretiyordu. Düzeltmenin ikinci yarısı
  budur: her dal artık bir satır basıyor ve `gh api`'nin stderr'i yutulmuyor.
- **Düşen liste ile boş liste ayrılmalı.** "Açık PR yok" ile "PR listesi
  alınamadı" farklı şeylerdir; ikincisi kolun hiç koşmadığı anlamına gelir ve
  yeşil bitmemelidir.

### 5.2 Hata yorumu başarılı denetim sayılınca sonsuz döngü oluştu (#563)

Mühendis-check düştüğünde gövdeye "Denetim yapılamadı" yazıp yine
`**Mühendis-check:**` önekiyle yorum bırakıyor. `internal-check.yml`'deki sayım
yalnız öneke baktığı için o **hata yorumunu denetim saydı**, sentezi tetikledi,
sentez kapıya çarpıp iç kontrolü geri çağırdı. 30 Ağustos akşamı #576 üzerinde
on tur döndü, 13 "Denetim yapılamadı" yorumu bıraktı ve o saatte **71 koşu**
yaktı.

Taşınabilir dersler:

- **Bir denetçinin varlığı ile hükmü ayrı sayılmalı.** "Yorum yazıldı" ile
  "denetim yapıldı" aynı şey değildir; hata yorumu da yorumdur. Sayım öneke
  değil, hükmün kendisine bakmalı.
- **Her geri çağırma sayaçlı olmalı.** İki iş akışı birbirini uyandırabiliyorsa
  döngü kaçınılmazdır; soru döngünün olup olmayacağı değil, kaçıncı turda
  duracağıdır. Burada üçüncü "Kapı kapalı" yorumundan sonra dispatch atlanıyor
  ve etiket yerinde bırakılıyor — süpürücünün beş denemelik kolu işi
  kaybetmiyor, yalnız döngü kendi kendini beslemeyi bırakıyor.
- **Sayaç tanımsız değişkenden sayamaz.** Bu sayaç ilk yazılışında o adımda
  var olmayan bir değişkeni okuyordu: her turda sıfır okur, yani sayaç varmış
  gibi görünüp hiçbir şey saymazdı.
- **Aynı ifade iki yerde iki kez yazılmaz.** Sayım ifadesi
  `pipeline-sweeper.yml`'den birebir alındı, çünkü iki yerde iki ayrı sayım
  yazmak ikisinden birinin sessizce ayrışması demek — ve zaten bir kez
  ayrışmıştı. Aynı kalıbın bir başka yüzü: aranan dize ile yazılan dize ayrı
  ayrı yazıldığında kaçınılmaz olarak birbirinden ayrılıyor. `pr-nanny.yml`'de
  aranan `**Denetci hukmu yok**` iken yazılan `**Denetci hukmu yok — yesil
  tike bakma.**` idi; o alt dize hiç oluşmadığı için sayaç her turda sıfır
  okudu ve kotaya takılmış her PR yarım saatte bir aynı notu yeniden aldı.
  İmza artık tek yerde tanımlı.

### 5.3 Yeni bir denetçiyi kapıya bağlarken kontrol listesi

1. `permissions` bloğuna gereken **her** kapsam yazılı mı? Statü okuyan iş için
   `statuses: read`, yazan iş için `statuses: write`; dispatch atan iş için
   `actions: write` (hem okuma hem yazma ister).
2. Kapı hangi `context` dizesini arıyor? Aranan ve yazılan bağlam **tek bir
   yerde** tanımlı mı?
3. Denetçi hiç koşmadığında ne oluyor? Yeşil kalıyorsa kapı yoktur. Bu
   deponun kuralı: **hükmü olmayan PR, yanlış hükmü olan PR'dan iyidir** —
   hüküm yazılamadığında durum `failure` düşer ve PR'a görünür not gider.
4. Hata yolu hükümsüzlük mü üretiyor, yoksa hüküm gibi mi görünüyor?
5. Her tetiklenme bir başka tetiklenme doğurabiliyor mu? Doğuruyorsa sayaç
   nerede?
6. Aynı SHA iki kez denetlenebiliyor mu? `denetci.yml` bunu işin **girdisine**
   göre anahtarlıyor, olaya göre değil: elle zorlamak için önce eski durumu
   silmek gerekiyor, sessizce tekrarlamak mümkün değil.

---

## 6. Nasıl karşılaştırılır

Fiyat tablosu bir denetçiyi seçmeye yetmez, çünkü ölçtüğü şey bulgunun bedeli,
değeri değil. 0,0035 $'lık bir denetçi, kaçırdığı tek bir migration kusuruyla
1,25 $'lık denetçiden pahalıya gelir. Karar ölçümle verilir.

**Yöntemin aracı henüz yok.** Bu belge önce `tools/denetci-karsilastir.mjs`
diye bir betiği yöntem olarak anlatıyordu; denetimde ölçüldü ki o dosya repoda
yok ve hiç yazılmadı. Yazılana kadar karşılaştırma elle yapılıyor: aynı PR'da
`Denetci` ile `Denetci (NVIDIA)` durumlarının açıklamaları ve iki denetçinin PR
yorumları yan yana okunuyor. Karar **iki haftanın** sonunda verilir; öncesinde
hiçbir denetçi hattan çıkarılmaz.

Betiğin yapması gereken iş şu, ve yazıldığında bu paragraf onunla değişir: aynı
PR listesi üzerinde her denetçinin hükmünü tek tabloya toplamak, birleşme
sonrası düzeltme gerektiren işleri işaretlemek, ve her düzeltme için hangi
denetçinin o kusuru önceden gördüğünü yazmak.

Karşılaştırmanın anlamlı olması için üç kural:

- **Aynı girdi.** Aynı diff, aynı `-U15` bağlamı, aynı kesme tavanı. Bir
  denetçi diff'in tamamını, öteki kırpılmışını okuyorsa karşılaştırılan şey
  denetçi değil, bütçedir.
- **Bulgular sayılmaz, tartılır.** Çok bulgu iyi denetçi demek değil: sekiz
  bulguluk bir bütçeyi biçim önerisiyle dolduran denetçi, tek migration
  kusurunu bulan denetçiden kötüdür. Ölçüt, **hattın gerçekten geri
  döndürdüğü** kusurlar: birleşme sonrası düzeltme gerektiren her iş için
  "hangi denetçi bunu görmüştü" diye geriye bakılır.
- **Kaçırılan kusur sayılır, ve o ancak geriye dönük sayılabilir.** Bu yüzden
  iki hafta: bir haftalık pencerede birleşen işin kusuru henüz ortaya
  çıkmamış olur.

İki hafta sonunda üç sonuçtan biri çıkar ve üçü de kabul edilebilir: ucuz
denetçi rutini devralır ve pahalısı kapıda kalır; ucuz denetçi zayıf çıkar ve
hattan çıkarılır; ya da fark ölçülemeyecek kadar küçük çıkar — o zaman ucuz
olan kazanır, çünkü eşit hüküm veren iki denetçi arasında seçim fiyat
kararıdır.

---

## 7. Bir sonraki projeye kopyalanacaklar

Sıra önemlidir: kapı, denetçiden **sonra** bağlanır. Denetçisi olmayan bir
kapı her PR'ı bekletir; kapısı olmayan bir denetçi hiç okunmaz — ikincisi
daha az zararlıdır, o yüzden sıra budur.

### Dosyalar

**GENEL — değiştirmeden kopyalanır:**

| Dosya | Ne yapar |
|---|---|
| `docs/DENETCI-MIMARISI.md` | Bu belge |
| `.github/scripts/llm.sh` | Tek metin kapısı; `LLM_SAGLAYICI` ile sağlayıcı sabitleme |
| `.github/workflows/denetci.yml` | Kapıya hüküm yazan denetçi, elle çağrılır |
| `.github/workflows/pr-check.yml` | Koda niyet denetimi |
| `.github/workflows/internal-check.yml` | Şartnameye iki göz |
| `.github/workflows/gemini-synthesis.yml` | Görüşleri tartıp onaya çıkarır |
| `.github/workflows/denetci-nvidia.yml` | Ucuz rutin denetçi; hükmü `Denetci (NVIDIA)` bağlamına yazar |
| `.github/workflows/pr-nanny.yml` | Bakım işi; `CodeRabbit` durumunu okuyup kota yüzünden yeşil kalan PR'lara hükümsüzlük notu düşer |
| `.github/workflows/pipeline-sweeper.yml` | Düşen koşuları yeniden dener |

Bu listede **karşılaştırma betiği yok**, çünkü betik yok (6. bölüm). Olmayan
bir dosyayı taşınacaklar listesine yazmak, yeni projede aranıp bulunamayacak
bir araç vaat etmektir.

**PROJE — her projede yeniden yazılır:** `.coderabbit.yaml` (yollar, tablolar
ve yardımcılar o projenindir; iskelet taşınır, kurallar taşınmaz),
`.github/workflows/ci.yml` (kesin hüküm buradan gelir).

Her makine dosyası sınıfını ilk satırında taşır (`SINIF: GENEL` /
`SINIF: PROJE`). Sınıf dosyanın kendisinde yazılı, çünkü ayrı tutulan bir
liste ile dosyalar zamanla ayrışır ve ayrışan liste yeni projeye yanlış
dosyayı taşır. `scripts/bootstrap-agents.sh` her dosyanın sınıfını o satırdan
okuyor — ama **hangi dosyalara bakacağını kendi içindeki sabit bir listeden**
alıyor, ve tam da bu yüzden o liste ayrışmış durumda: denetimde ölçüldü,
sınıf satırı taşıyan 32 dosyanın 13'ü betiğin listesinde yok ve
`denetci.yml` bunlardan biri. Kaçınılan tuzağın küçültülmüş bir kopyası hâlâ
betiğin içinde duruyor; dosya listesi de diskten türetilmeli.

### Secret ve değişkenler

| Ad | Tür | Ne için | Yoksa |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | secret | Denetçi ve iç kontrol | Denetim atlanır, "denetim yapılamadı" notu düşer |
| `GEMINI_API_KEY` | secret | Yazar tarafı | Hat metin üretemez |
| `NVIDIA_API_KEY` | secret | Ucuz rutin denetim (`denetci-nvidia.yml`) | Ucuz kol `failure` yazıp PR'a not düşer; öteki denetçiler etkilenmez |
| `CLAUDE_FALLBACK_MODEL` | repo değişkeni | Yazar ve sentez akışlarının Claude modeli | Tanımsızsa iş akışı kendi varsayılanına düşer (`claude-sonnet-5`) |
| `CLAUDE_ARCHITECT_MODEL` | repo değişkeni | Mimar — güçlü model olmalı | Ucuz model estetik yargıda uydurur (ölçüldü) |
| `CLAUDE_CHECK_MODEL` | repo değişkeni | Mühendis-check — ucuz kalabilir | Hedefli bağlam sayesinde |

Model adı iş akışına gömülmez, repo değişkeninden okunur. Gömülen ad,
sağlayıcı modeli emekliye ayırdığı gün hattın tamamını düşürür ve arıza
YAML'da aranır. Kural bu depoda **tam uygulanmıyor** ve bunu yazmak kuralı
yazmaktan önemli: `denetci.yml` modeli farkın boyutuna ve dokunduğu yollara
göre kendi seçtiği için iki adı doğrudan gömüyor (`claude-sonnet-5`,
`claude-haiku-4-5-20251001`) ve o iki satırın `vars.` karşılığı yok. Öteki
akışların hepsi `${{ vars.CLAUDE_FALLBACK_MODEL || '...' }}` kalıbını
kullanıyor. Yeni projede seçim mantığı korunup adlar değişkene çıkarılmalı.

### Sıra

1. `ANTHROPIC_API_KEY` ve `GEMINI_API_KEY` tanımla. **En az iki sağlayıcı**
   şart, ama ikincisi kendiliğinden devreye girmez: devralma `LLM_YEDEK=1` ile
   açıkça açılır, varsayılan davranış işi ertelemektir.
2. `llm.sh`'i kopyala ve `LLM_SAGLAYICI` ayrımının yerinde olduğunu doğrula:
   **kodu yazan aileye kendi ödevini okutmak denetim değil, kendini
   işaretlemektir.**
3. `internal-check.yml`'i bağla. Kod yazılmadan önceki denetim en ucuzudur.
4. `ci.yml`'i o projenin araç zinciriyle yaz. Kesin hüküm CI'dan gelir;
   denetçi hükmü onun yerine geçmez.
5. `.coderabbit.yaml`'ı o projenin kurallarıyla yaz. `drafts: true` kalsın —
   otonom ajan PR'ları taslak açar, taslakları atlamak denetçiyi tam da
   denetlemesi gereken kodun dışında bırakır.
6. `denetci.yml`'i bağla ve **elle tetikleyicide bırak**. Otomatik
   tetikleyiciyi eklemeden önce 3. bölümdeki tabloyu yeniden oku.
7. `pr-nanny.yml` kapı kolunu bağla. `permissions` bloğuna `statuses` yaz —
   5.1 tam olarak bu satırın yokluğu.
8. Ucuz denetçiyi (`denetci-nvidia.yml`) ekle ve iki hafta ölç. Kendi bağlam
   dizesini yazsın, `Denetci`nin üstüne değil. Karşılaştırma betiği henüz yok
   (6. bölüm); ölçüm o gelene kadar elle yapılır. Karar öncesinde hiçbir
   denetçi hattan çıkarılmaz.
9. `scripts/bootstrap-agents.sh` çalıştır. Ne sorduğunu bilmek gerekiyor,
   çünkü yeşili "her şey yerinde" değil "sorduklarım yerinde" demektir:
   `gh` kurulumu ve yetkisi, etiketler, `GEMINI_API_KEY` ile
   `ANTHROPIC_API_KEY`, belgelerin varlığı, `.agentrc`, ve listesindeki
   20 dosyanın sınıf satırı. `NVIDIA_API_KEY`i sormuyor ve dosya listesi
   eksik (yukarıda).

### Taşınmayanlar

Bu belgedeki **sayılar** taşınmaz. 23.000 çıktı token'ı Vault'un diff
boyutlarının ölçüsüdür; 5284 token 5 KB'lik bir diff'in ölçüsüdür; %20 bir
dönemin CodeRabbit kotasının ölçüsüdür. Yeni projede bunlar yeniden ölçülür ve
bu belgenin tabloları o ölçümle güncellenir. Taşınan şey yöntemdir: neyin
ölçüleceği, hangi tuzağın nerede beklendiği, ve ölçülmemiş bir sayının
yazılmayacağı.
