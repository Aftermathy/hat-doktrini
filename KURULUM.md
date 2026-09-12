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

Betik on altı sarmalayıcıyı indirir, on bir etiketi ve altı depo değişkenini
açar. Gizli anahtarları **açmaz** — onlar aşağıda.

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

| Dosya | Ne |
|---|---|
| `.github/workflows/ci.yml` | projenin derleme ve test komutları |
| `CLAUDE.md` | projenin kuralları, doğrulama komutları, tuzakları |
| `docs/PRODUCT-DNA.md` | ürünün ne olduğu ve olmadığı |
| `docs/ROADMAP.md` | fazlar — `roadmap-keeper` bunu PR'ların `Closes #N` atfından günceller |
| `CONTEXT.md` | kavram sözlüğü; aynı kavramın dört ajanda dört adı olmasın diye |

### 3. `pr-check` içindeki `DUYU_KALIP`

Mimar pahalı ve yalnız **duyuya dokunan** farkta çağrılıyor. Kalıp bu depoda
Vault'un yollarıyla yazılı (`src/`, `.css`, `tailwind.config`, iOS arayüz
dosyaları). Bu projede kullanıcının gördüğü dosyalar başka yerdeyse kalıbı ona
göre yazın — ve **dar tutun**, denetim PR başına fiyatlanıyor.

## Doğrulama

```sh
gh workflow list              # on altı iş akışı görünmeli
gh workflow run maliyet.yml   # en basit tur; yeşil bitmeli
gh variable list              # altı değişken
gh secret list                # dört anahtar
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
