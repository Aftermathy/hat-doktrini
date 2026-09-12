# Otonom geliştirme hattı — doktrin ve paylaşılan iş akışları

Bu depo bir ürün taşımıyor. İçinde, birden çok projenin **aynı anda** kullandığı
geliştirme hattı duruyor: issue'ları şartnameye çeviren, üç ajanla denetleyen,
sahibin onayından sonra kodu yazdıran ve PR'ları toplu sunumla kapıya getiren
iş akışları.

## Neden ayrı depo

Bu dosyalar önce projelere **kopyalanıyordu** ve her kopya kendi yoluna
gidiyordu: bir projede düzeltilen arıza ötekilerde duruyor, bir projede
öğrenilen ders ötekilere geçmiyordu. `SINIF: GENEL` etiketi ayrımı baştan
öngörmüştü ama onu uygulayacak mekanizma yoktu.

Artık tek kopya burada. Projeler `workflow_call` ile çağırıyor.

## Yeni projeye kurmak

Tek komut — hedef projenin kökünde:

```sh
curl -sL https://raw.githubusercontent.com/Aftermathy/hat-doktrini/v1/tools/kur.sh | bash
```

Ayrıntı ve elle yapılacaklar: **[KURULUM.md](KURULUM.md)**.
Claude Code oturumuna doğrudan "bu deponun `KURULUM.md`'sini oku ve hattı kur"
demek de yeterli.

## Nasıl çalışır

Projede ince bir sarmalayıcı durur; tetikleyici orada, iş burada:

```yaml
# projede — .github/workflows/internal-check.yml
name: İç kontrol
on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue: { description: "Issue numarası", required: true }
permissions:
  contents: read
  issues: write
jobs:
  cagir:
    uses: Aftermathy/hat-doktrini/.github/workflows/internal-check.yml@v1
    with:
      issue: ${{ inputs.issue }}
    secrets: inherit
```

**Sürüm etiketi kullanın, `@main` değil.** `@main` derseniz buraya giren bozuk
bir değişiklik aynı anda bütün projeleri kırar. `@v1` ile her proje kendi
ritminde geçer.

## Çağıran bağlam korunur

`workflow_call` ile çağrıldığında şunlar **çağıran deponun** değerleridir:
`github.repository`, `github.event`, `github.event_name`, `vars.*`, ve
`secrets: inherit` ile gelen anahtarlar. Yani buradaki dosyalar hangi projeden
çağrılırsa o projenin issue'larına, PR'larına ve ayarlarına bakar.

## Gereken ayarlar

Her tüketici projede tanımlı olmalı.

**Gizli anahtarlar:**

| Anahtar | Ne için |
|---|---|
| `ANTHROPIC_API_KEY` | mimar denetimi (görsel okuyabilen tek katman) |
| `GEMINI_API_KEY` | ürün yöneticisi, sentez, triyaj |
| `NVIDIA_API_KEY` | mühendis denetimi ve PR denetçisi (ücretsiz uç nokta) |
| `TOPLU_PAT` | GitHub jetonu — Contents, Workflows, **Pull requests**: write |

`TOPLU_PAT` neden gerekli: GitHub'ın otomatik jetonu `.github/workflows/`
altına hiçbir koşulda yazamaz, ve onunla açılan PR `pull_request` olayını
doğurmaz. Süresini uzun verin; dolduğunda hat sessizce durur.

**Depo değişkenleri:**

| Değişken | Önerilen |
|---|---|
| `CLAUDE_ARCHITECT_MODEL` | `claude-sonnet-5` |
| `CLAUDE_CHECK_MODEL` | `claude-haiku-4-5-20251001` |
| `CLAUDE_FALLBACK_MODEL` | `claude-sonnet-5` |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `NVIDIA_ARCHITECT_MODEL` | `deepseek-ai/deepseek-v4-pro-0813` |
| `TOPLU_ARALIK_SAAT` | `4` |

**Etiketler:** `agent-ready`, `internal-check`, `needs-approval`, `kusurlu`,
`taslak`, `lokal`, `sende`, `needs-device`, `gemini`, `toplu`, `acil`.
Biri eksikse o yol sessizce kapalı kalır.

## Burada olmayan, projede kalan

- `ci.yml` — projenin kendi derleme ve test komutları
- `CLAUDE.md` — projenin kuralları ve tuzakları
- `PRODUCT-DNA.md`, `ROADMAP.md`, `CONTEXT.md`
- `pr-check` içindeki `DUYU_KALIP` gibi projeye özgü ayarlar

## Doktrin

`docs/AGENT-WORKFLOW.md` — görev döngüsü, roller, etiketler, insan kapıları.
`docs/DENETCI-MIMARISI.md` — denetim katmanları ve hangi modelin neden
seçildiği.

Her ikisi de ölçümle yazıldı: içindeki sayılar tahmin değil, denenmiş
değerler. Değiştirmeden önce gerekçesini okuyun.
