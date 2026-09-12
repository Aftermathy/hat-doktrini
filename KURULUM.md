# Yeni projeye hattı kurma

Bu belge, bu depodaki hattı yeni bir projeye bağlamak için yazıldı. Claude
Code oturumuna doğrudan şunu söylemeniz yeterli:

> `https://github.com/Aftermathy/hat-doktrini` deposundaki `KURULUM.md`'yi oku
> ve bu projeye hattı kur.

## Hat nedir

Issue'lar şartnameye dönüşüyor, üç ajan onları denetliyor, sahibin onayından
sonra bulut mühendisi kodu yazıyor, PR'lar denetimden geçip toplu sunumla
sahibin kapısına geliyor. Zamanlanmış iş akışları bunu insan müdahalesi
olmadan döndürüyor.

İş akışlarının gövdesi **bu depoda**; projeler onları `workflow_call` ile
çağırıyor. Yani bir projede öğrenilen ders ötekilere geçiyor.

## Tek komutla

Hedef projenin kökünde:

```sh
curl -sL https://raw.githubusercontent.com/Aftermathy/hat-doktrini/v1/tools/kur.sh | bash
```

Betik sürüm arşivinden on altı sarmalayıcıyı ve yerel ajanın skill'lerini
kopyalar, on iki etiketi ve altı depo değişkenini açar, doktrinin şart
koştuğu üç depo ayarını yazar. Gizli anahtarları **açmaz** — onlar aşağıda.

Farklı sürüm için: `HAT_SURUM=v2 bash tools/kur.sh`

## Elle yapılacaklar

### 1. Gizli anahtarlar

```sh
gh secret set ANTHROPIC_API_KEY   # mimar denetimi (görsel okuyabilen tek katman)
gh secret set GEMINI_API_KEY      # ürün yöneticisi, sentez, triyaj
gh secret set NVIDIA_API_KEY      # mühendis denetimi ve PR denetçisi (ücretsiz)
gh secret set TOPLU_PAT           # GitHub jetonu
```

Nereden alınır:

| Anahtar | Adres |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → Settings → API keys |
| `GEMINI_API_KEY` | ai.studio → Get API key |
| `NVIDIA_API_KEY` | build.nvidia.com → API key (ücretsiz katman) |
| `TOPLU_PAT` | github.com → Settings → Developer settings → Personal access tokens → Fine-grained |

**`TOPLU_PAT` kapsamı** — üçü de `Read and write` olmalı: **Contents**,
**Workflows**, **Pull requests**. İlk ikisi olmazsa sunum dalı itilemez;
üçüncüsü olmazsa PR bot kimliğiyle açılır ve denetçiler onu atlar.

Süresini uzun verin. Dolduğunda hat sessizce durur ve sebebi anlaşılması zor
bir yerde olur.

### 2. Projeye özgü dosyalar

**Bunlar kopyalanmaz — her proje kendi dosyalarını yazar.** Vault'unkine örnek
olarak bakabilirsiniz (`github.com/Aftermathy/vault`) ama içeriğini almayın:
o dosyalar Vault'un ürününü, kurallarını ve tuzaklarını anlatıyor. Kopyalanan
bir `CLAUDE.md`, ajanlara var olmayan bir projeyi öğretir.

| Dosya | Zorunlu mu | Ne içerir | Yoksa ne olur |
|---|---|---|---|
| `.github/workflows/ci.yml` | **evet** | Projenin derleme, lint ve test komutları. Hattın CI kapısı bu dosyanın adını arıyor; farklı ad verilecekse `TOPLU_CI_AKISI` değişkenine yazın. | Kesin hüküm yok; hiçbir PR birleşemez |
| `CLAUDE.md` | **evet** | Projenin kuralları, doğrulama komutları, bilinen tuzakları. Ajanların ilk okuduğu dosya. | Mühendis ve denetçi kör |
| `docs/ROADMAP.md` | **evet** | Fazlar ve sabit kararlar. Biçim kısıtları aşağıda — uyulmazsa bekçi sessizce hiçbir şey işaretlemez. **Fazlar bölümü boş başlar**, doğuş ritüeli doldurur. | PM sıradaki işi bulamaz |
| `docs/PRODUCT-DNA.md` | evet sayılır | Ürünün ne olduğu ve **olmadığı**. Mimar denetimi bu dosyadaki kabul ölçütlerine bakıyor; yoksa "duyu" denetimi dayanaksız kalır. | Ürün yöneticisi karaktersiz |
| `docs/roles/mimar.md` | **evet** | Mimarın talimatı; `internal-check` buradan okur. Vault'unki örnek, ölçüler DNA'da durur, burada rol tanımlanır. | **Mimar hüküm vermez** — sessizce, hata da vermez |
| `CONTEXT.md` | önerilir | Kavram sözlüğü. Aynı kavramın dört ajanda dört adı olmasın diye; şartnameyi bir model yazıyor, ikisi denetliyor, biri kodluyor. | Her PR'da ad pazarlığı |
| `.agentrc` | önerilir | Kaynak dökümü yolları ve uzantıları (`KAYNAK_YOLLARI`, `KAYNAK_UZANTILARI`, `KAYNAK_HER_ZAMAN`). | `src` varsayılanı ve uyarı |
| `docs/notes/` | önerilir | Mühendislik notları, her biri kendi dosyasında; `kur.sh` dizini açar. | Notlar özeti boş döner |
| `docs/ENGINEERING-NOTES.md` | hayır | Eski tek dosyalı notlar yolu. `v2`'den itibaren gerekmiyor (#5 merkezde kapı koydu); `v1`'de yoksa `gemini-triage` ve `gemini-revise` düşer — `v1`'de kalan proje içine "notlar `docs/notes/` altında" yazan bir dosya tutar. | `v1`: triyaj ve revizyon düşer |

#### `docs/ROADMAP.md` biçim kısıtları

`roadmap-keeper` bu dosyayı ayrıştırıyor. Üç şey birebir olmalı:

**1. Yol tam olarak `docs/ROADMAP.md`.** Bekçi başka yere bakmaz.

**2. Tamamlanacak maddeler şu biçimde:**

```markdown
- ⏳ Kullanıcı davet koduyla kasaya katılabilir (#42)
```

Bir PR `Closes #42` yazarak birleştiğinde bekçi o satırı bulup `⏳`yi `✅`
yapıyor. Aradığı kalıp `^- ⏳.*#42` — yani satır `- ⏳` ile başlamalı ve
issue numarası `#42` olarak geçmeli. Başka bir işaret (`- [ ]`, `* ⏳`)
kullanırsanız bekçi hiçbir şey bulamaz ve **hata da vermez**.

**3. Sabit kararlar bölümü:**

```markdown
## Sabit kararlar

| Karar | Gerekçe |
|---|---|
| Para kuruş cinsinden tam sayı | Kayan noktalı para aritmetiği bütçede kabul edilemez |
```

Başlık birebir `## Sabit kararlar` olmalı ve altında bir markdown tablosu
bulunmalı. PR gövdesinde `harita: sabit-karar | <karar> | <gerekçe>` satırı
görürse bekçi yeni satırı bu tablonun sonuna ekliyor.

Kapanmış fazları ayrı bir dosyaya taşıyacaksanız (`docs/ROADMAP-ARCHIVE.md`
gibi) bekçi oraya bakmaz — arşiv tamamen sizin düzeniniz.

### 3. Mimarın çağrılacağı dosya kalıbı — `DUYU_KALIP`

Mimar pahalı ve yalnız **duyuya dokunan** farkta çağrılıyor. Kalıp bir depo
değişkenidir; kullanıcının gördüğü dosyalar bu projede neredeyse onu yazın
ve **dar tutun**, denetim PR başına fiyatlanıyor:

```sh
gh variable set DUYU_KALIP --body '^\+\+\+ b/(src/|.*\.css$|tailwind\.config)'
```

Tanımsızsa merkez genel kalıba düşer (`src/`, `.css`, `tailwind.config`) ve
koşu günlüğüne uyarı basar. Native arayüz dosyaları olan proje (iOS widget,
Swift intent) onları kalıba kendisi yazar. Kalıp geçersiz bir düzenli ifadeyse
mimar **yine de çağrılır** ve PR'a "DUYU_KALIP bozuk" yorumu düşer — bozuk
kalıbın bedeli bir mimar çağrısıdır, kaçırılmış bir denetim değil. (`v1`
etiketinde kalıp gömülüdür; değişken `v2`'den itibaren okunur.)

### 4. Depo ayarları

`kur.sh` `gh` varsa üçünü yazar; elle kontrol için Settings → General:

- Pull Requests: yalnız **Allow merge commits** açık; squash ve rebase
  **kapalı**. Squash, sunumdaki tekil PR'ların commit'lerini `main`'den
  erişilemez yapar ve `Closes #N` hiç işlemez.
- **Automatically delete head branches** açık — tur başına bir sunum dalı
  doğuyor.
- Actions → General → Workflow permissions: **Allow GitHub Actions to create
  and approve pull requests** açık. Kapalıyken sunum dalı itilir ama PR
  açılamaz.

Depo **özelse** Actions dakikası ücretsiz kotayla sınırlı. Kota bittiğinde
her job iki saniyede, runner atanmadan, log üretmeden düşer — kod hatası gibi
görünmez. Hattın tamamı sessizce durur.

### 5. Yerel ajanın skill'leri

`kur.sh` `.claude/skills/` altına kopyalar (`sorgulama`, `prototip`,
`sartname-uyumu`, `prompt-butcesi`, `ajan-hatti`, …). Doktrin bunlara adıyla
atıf yapıyor; sahibin makinesindeki Claude Code oturumu onları buradan okur.
`v1` arşivinde yoklar; `v2`'den itibaren gelir.

## Doğrulama

```sh
gh workflow list              # on altı iş akışı görünmeli
gh workflow run maliyet.yml   # en basit tur; yeşil bitmeli
gh variable list              # altı model/pencere değişkeni + DUYU_KALIP
gh secret list                # dört anahtar
gh label list                 # on iki hat etiketi
```

Sonra bir deneme issue'su açıp `internal-check` etiketi koyun: üç ajan da
(mühendis, mimar, ürün yöneticisi) yorum yazmalı.

## Bilinen tuzaklar

Bunlar kurulum sırasında ölçüldü ve merkezde çözüldü; yeni projede
tekrarlanmaması için yazılı:

**Eşzamanlılık iki yerde olmaz.** Grup adı hem sarmalayıcıda hem merkezde
aynıysa çağıran grubu tutar, çağrılan aynı grubu ister ve kendi kendini
bekleyip düşer — iş hiç başlamaz, job listesi boş kalır ve **hata mesajı da
görünmez**. Eşzamanlılık yalnız sarmalayıcıda.

**İzin tavanını sarmalayıcı verir.** Reusable workflow'un işleri çağıranın
tavanını aşamaz; sarmalayıcıda `permissions` yoksa tavan varsayılan `read`
olur ve write isteyen işler `startup_failure` verir. Sarmalayıcılarda tavan
zaten yazılı, silmeyin.

**Zorunlu girdi olmaz.** Sarmalayıcılar aynı dosyayı hem `workflow_dispatch`
(girdi dolu) hem olay tetikleyicileriyle (girdi **boş**) çağırıyor.
`required: true` ikinci durumda çağrıyı hiç çözümlenmez yapar.

**Tek sunum kilidi hattı durdurur.** Açık bir toplu sunum varken yeni tur
açılmaz; sunum sahibin kapısındadır. Sahip gelmezse hat tümüyle durur — bunu
bilerek kurun ve sahibe söyleyin.

**Şartname koda karşı sınanmadan yazılmaz.** En sık tekrarlanan arıza: şartname
"şu koruma yok" diyor, oysa koruma duruyor. Kural — *bir şartname bir şeyin
yokluğunu iddia ediyorsa, ilk iş o yokluğu doğrulamak.*

## Merkez değişirse

`docs/AGENT-WORKFLOW.md` içindeki "Merkez doktrin değişirse" bölümü: her
tüketici projenin yerel ajanı değişikliği kendi deposunda sınar, hepsi geçerse
yeni sürüm etiketi atılır. Projeler `@main` değil sürüm etiketiyle çağırır ki
başka bir projenin denemesi bu projeyi kırmasın.
