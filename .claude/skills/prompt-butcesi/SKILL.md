---
name: prompt-butcesi
description: LLM hattının faturası sessizce büyüdüğünde nereye bakılacağı ve prompt'a dosya basan her bloğun neden bütçeli olması gerektiği. Use when an agent pipeline's cost grows, or when adding anything that prints files into a prompt.
---

# Prompt bütçesi

Bir hattın faturası tek bir kötü kararla değil, **her gün biraz** artarak
büyür. Bu yüzden fark edilmez: hiçbir günün artışı alarm vermez, ama üç gün
sonra çağrı başına yedi kat ödüyorsundur.

## Ölçüm — tahminle başlama

Defterde çağrı başına **girdi token'ı** gün ve model bazında olmalı. Vault'ta
kayıt `docs/maliyet.tsv` (tarih, koşu, model, girdi, çıktı):

```sh
awk -F'\t' '$1>="2026-08-21" {n[$1"\t"$3]++; gi[$1"\t"$3]+=$4} END \
  {for (k in n) printf "%s\tcagri=%d\tcagri_basi=%d\n", k, n[k], gi[k]/n[k]}' \
  docs/maliyet.tsv | sort
```

Bu tabloyu okurken aranan şey **toplam değil, çağrı başına**. Toplam
büyümesi iş hacmiyle açıklanabilir; çağrı başına büyüme açıklanamaz.

Gerçek ölçüm (Vault, 21→24 Ağustos):

| Gün | mühendis-check | PM/triyaj |
|---|---|---|
| 21 Ağu | 10.505 | 105.797 |
| 24 Ağu | **75.163** | 124.790 |

## Bulunan sebep ve genel kural

`docs/notes/` altındaki en yeni 20-25 not **tam metin** ve **bütçesiz**
basılıyordu. Depo notla doldukça prompt büyüdü: 20 not 92 KB, 25 not 110 KB.
Hat, kendi yazdığı belgeyle kendini pahalılaştırıyordu.

> **Prompt'a dosya basan her blok bütçeli olmalı.** Bütçesiz bir blok bugün
> küçüktür ve yarın faturanın en büyük kalemidir; büyümesi kimsenin gözüne
> çarpmaz, çünkü tek bir günde değil her gün biraz artar.

Kaynak dökümünün bütçesi vardı ve tartışılarak konmuştu. Notların bütçesi
hiç konmamıştı — eksiklik bir karar değil, gözden kaçmaydı.

## Çözüm deseni: özet, tam metin değil

Bir belgenin prompt'taki işlevi çoğu zaman **var olduğunu ve ne dediğini**
bildirmek; gerekçenin tamamını okumak okuyanın işi değil. `scripts/not-ozet.mjs`
bunu yapıyor: en yeniden geriye, bütçe dolana kadar **başlık + ilk dolu
paragraf**, dosya adıyla birlikte.

Ölçüldü: 91.654 bayt → **7.775 bayt** (%92 azalma) ve kalan bayt daha bilgili
— künye yerine bulgu taşıyor (ilk paragraf çoğu notta tarih ve issue
numarasıdır; özetleyici onu atlar).

## Bütçe koyarken

- **En yeniden geriye doldur.** Bütçe dolduğunda kesilen *eski* olsun.
- **Kesileni say ve yaz.** "3 eski not sığmadı" satırı, sessiz kırpmayı
  görünür kılar. Sessiz kırpma "hepsi okundu" diye okunur.
- **Belge başına da tavan koy.** Tek bir uzun not bütçenin tamamını yiyebilir.
- **Rolün işine göre ayır.** Vault'ta denetçi mühendisin kaynak bütçesi 60 KB,
  ürün yöneticisininki 400 KB'ydi; ikincisi bir karar değil kalıntıydı ve
  120 KB'ye indirildi. Şartname yazan, kod denetleyenden daha az kod okur.

## Sayarken düşülecekler

Koşu sayarken `skipped` **ve** `cancelled` düşülür. Eşzamanlılık grubu
bekleyen koşuyu iptal ediyor ve iptal edilen koşu model çağırmıyor. Yalnızca
`skipped` düşen bir sayım Vault'ta PM'i 19 gösterdi; gerçek 4'tü — beş kat
abartı ve yanlış bir alarm.

```sh
gh run list --workflow "<ad>" --limit 200 --json createdAt,conclusion \
  --jq "[.[] | select(.createdAt > \"$S\") \
        | select(.conclusion==\"success\" or .conclusion==\"failure\")] | length"
```

## Bilinen tuzak: sessiz yedek

Bir sağlayıcı düştüğünde sessizce ikincisine geçen bir kapı, arızayı yalnızca
faturada gösterir. Vault'ta `GEMINI_MODEL` bir önizleme modeline bağlıyken her
çağrı düştü, kapı sessizce Claude'a devretti ve hat haftalarca pahalı modelde
koştu. Yedek **opt-in** olmalı (`LLM_YEDEK=1`); varsayılan davranış "iş
ertelendi"dir. Bir hattı tek ücretsiz katmana bağlamak o katmanın kotasını
hattın kapasitesi yapar; sessizce ikinciye geçmek kotayı faturaya çevirir.
