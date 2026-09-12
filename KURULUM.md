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

Bunlar kopyalanmaz, bu proje için yazılır:

| Dosya | Ne | Yoksa |
|---|---|---|
| `.github/workflows/ci.yml` | projenin derleme ve test komutları | kesin hüküm yok; hiçbir PR birleşemez |
| `CLAUDE.md` | projenin kuralları, doğrulama komutları, tuzakları | mühendis ve denetçi kör |
| `docs/PRODUCT-DNA.md` | ürünün ne olduğu ve olmadığı | ürün yöneticisi karaktersiz |
| `docs/ROADMAP.md` | fazlar — `roadmap-keeper` bunu PR'ların `Closes #N` atfından günceller; **Fazlar bölümü boş başlar**, doğuş ritüeli doldurur | PM sıradaki işi bulamaz |
| `CONTEXT.md` | kavram sözlüğü; aynı kavramın dört ajanda dört adı olmasın diye | her PR'da ad pazarlığı |
| `docs/roles/mimar.md` | mimarın talimatı (`internal-check` buradan okur); Vault'unki örnek, ölçüler DNA'da | **mimar hüküm vermez** — sessizce |
| `.agentrc` | kaynak dökümü yolları ve uzantıları (`KAYNAK_YOLLARI`, `KAYNAK_UZANTILARI`, `KAYNAK_HER_ZAMAN`) | `src` varsayılanı ve uyarı |
| `docs/notes/` | mühendislik notları, her biri kendi dosyasında (`kur.sh` dizini açar) | özet boş döner |
| `docs/ENGINEERING-NOTES.md` | **geçici işaretçi**: `gemini-triage` ve `gemini-revise` eski yolu hâlâ `cat` ile okuyor; yoksa o adımlar `set -e` altında düşer. İçine "notlar `docs/notes/` altında" yazın; merkez özete geçince silinir | triyaj ve revizyon düşer |

### 3. Mimarın çağrılacağı dosya kalıbı — `DUYU_KALIP`

Mimar pahalı ve yalnız **duyuya dokunan** farkta çağrılıyor. Kalıp bir depo
değişkenidir; kullanıcının gördüğü dosyalar bu projede neredeyse onu yazın
ve **dar tutun**, denetim PR başına fiyatlanıyor:

```sh
gh variable set DUYU_KALIP --body '^\+\+\+ b/(src/|.*\.css$|tailwind\.config)'
```

Tanımsızsa merkez Vault'un kalıbına düşer (`src/`, `.css`, `tailwind.config`
ve Vault'un iOS dosyaları) ve koşu günlüğüne uyarı basar. (`v1` etiketinde
kalıp henüz gömülüdür; değişken `v2`'den itibaren okunur.)

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
