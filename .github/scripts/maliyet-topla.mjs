#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// Hattın kendi faturası. Token satırlarını ve koşu envanterini okur, günlük
// deftere işler, insanın bakacağı iki yüzü üretir: docs/MALIYET.md (GitHub'da
// okunur) ve docs/maliyet.html (yerelde açılır, grafikli).
//
//   node maliyet-topla.mjs --ham ham.txt --kosular kosular.json \
//        --tsv docs/maliyet.tsv --kosu-tsv docs/kosular.tsv \
//        --md docs/MALIYET.md --html docs/maliyet.html
//
// Ham satır (llm.sh yazar): MALIYET|<workflow>|<sağlayıcı/model>|<girdi>|<çıktı>
// kosular.json: gh run list --json name,conclusion,createdAt,startedAt,updatedAt
//
// NEDEN VAR: harcamayı yalnızca sağlayıcının ekranından, o da 24 saat
// gecikmeyle görebiliyorduk. Bir hattın kendi faturasını göremiyor olması,
// sessiz yedeğin haftalarca pahalı modelde koşmasının sebebiydi.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const arg = (ad, varsayilan = '') => {
  const i = process.argv.indexOf(`--${ad}`)
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : varsayilan
}

const HAM = arg('ham')
const KOSULAR = arg('kosular')
const TSV = arg('tsv', 'docs/maliyet.tsv')
const KOSU_TSV = arg('kosu-tsv', 'docs/kosular.tsv')
const MD = arg('md', 'docs/MALIYET.md')
const HTML = arg('html', 'docs/maliyet.html')
const KANAL = arg('kanal', 'docs/kanallar.tsv')

// Milyon token başına dolar. Claude fiyatları Anthropic'in yayımladığı
// listedir. Gemini için rakam UYDURULMAZ: ilk gerçek faturadan okunup
// GEMINI_GIRDI / GEMINI_CIKTI ile verilir. Fiyatı bilinmeyen model token
// olarak sayılır, dolar sütununda "—" görünür — sahte kesinlik, hiç
// rakam olmamasından kötüdür.
const FIYAT = {
  // Kaynak: ai.google.dev/gemini-api/docs/pricing — 21 Ağustos 2026'da okundu.
  // DİKKAT: bu fiyat 31 Aralık 2026'da ikiye katlanıyor ($1.50 / $7.50).
  // O tarihte burası güncellenmezse sayaç harcamayı yarı gösterir.
  'gemini/gemini-3.6-flash': [0.75, 3.75],
  // Sonnet 5: $2/$10 — tanıtım fiyatı olarak duyurulmuştu, 21 Ağustos 2026'da
  // belge 'artık standart fiyat, 1 Eylül artışı olmayacak' diyor.
  'claude/claude-sonnet-5': [2.0, 10.0],
  'claude/claude-opus-5': [5.0, 25.0],
  'claude/claude-fable-5': [10.0, 50.0],
  'claude/claude-haiku-4-5-20251001': [1.0, 5.0],
  'claude/claude-haiku-4-5': [1.0, 5.0],
}
// Tabloda olmayan bir Gemini modeli için yedek fiyat; boşken o model
// token olarak sayılır, dolara katılmaz.
const GG = Number(process.env.GEMINI_GIRDI || 0)
const GC = Number(process.env.GEMINI_CIKTI || 0)

const BUGUN = process.env.MALIYET_TARIH || new Date().toISOString().slice(0, 10)

const oku = (yol) => (existsSync(yol) ? readFileSync(yol, 'utf8') : '')

// ------------------------------------------------------------- token defteri
// Defter KOŞUYA göre anahtarlanıyor. İlk tasarım "o günün satırlarını sil,
// yeniden yaz" idi ve ilk gerçek kullanımda üç saatlik pencereyle tazeleme
// günün geri kalanını sildi. Koşu kimliği taşınınca tazeleme her pencereyle
// güvenli: gördüğü koşuyu günceller, görmediğine dokunmaz.
const defter = new Map()
for (const satir of oku(TSV).split('\n')) {
  const [tarih, kosu, model, g, c, oy, oo] = satir.split('\t')
  if (!tarih || !model) continue
  defter.set(`${tarih}\t${kosu}\t${model}`, [Number(g) || 0, Number(c) || 0, Number(oy) || 0, Number(oo) || 0])
}

// Bir koşunun kaydı yeniden okunduğunda üstüne eklenmemeli, o koşunun
// toplamı baştan kurulmalı.
const buTur = new Map()
let cagri = 0
for (const satir of oku(HAM).split('\n')) {
  const p = satir.trim().replace(/\r$/, '').split('|')
  if (p[0] !== 'MALIYET' || p.length < 6) continue
  const k = `${BUGUN}\t${p[1]}\t${p[3]}`
  const [g, c, oy, oo] = buTur.get(k) ?? [0, 0, 0, 0]
  buTur.set(k, [g + (Number(p[4]) || 0), c + (Number(p[5]) || 0), oy + (Number(p[6]) || 0), oo + (Number(p[7]) || 0)])
  cagri++
}
for (const [k, v] of buTur) defter.set(k, v)

const kayitlar = [...defter.entries()]
  .map(([k, v]) => {
    const [tarih, kosu, model] = k.split('\t')
    return { tarih, kosu, model, girdi: v[0], cikti: v[1], onyaz: v[2] || 0, onoku: v[3] || 0 }
  })
  .sort((a, b) => (a.tarih === b.tarih ? a.model.localeCompare(b.model) : b.tarih.localeCompare(a.tarih)))

writeFileSync(
  TSV,
  kayitlar.map((r) => [r.tarih, r.kosu, r.model, r.girdi, r.cikti, r.onyaz, r.onoku].join('\t')).join('\n') + '\n',
)

// ------------------------------------------------------------ koşu envanteri
const kosuDefter = new Map()
for (const satir of oku(KOSU_TSV).split('\n')) {
  const [tarih, ad, sonuc, adet, saniye] = satir.split('\t')
  if (!tarih || !ad) continue
  kosuDefter.set(`${tarih}\t${ad}\t${sonuc}`, [Number(adet) || 0, Number(saniye) || 0])
}
// Envanter de koşuya göre kurulur; görülen koşular baştan sayılır, görülmeyen
// gün korunur. Aksi hâlde dar pencere geçmişi siler.
const gorulen = new Map()

let sonKosu = new Map()
if (KOSULAR && existsSync(KOSULAR)) {
  let ham = []
  try {
    ham = JSON.parse(readFileSync(KOSULAR, 'utf8'))
  } catch {
    console.error('maliyet: koşu envanteri okunamadı, koşu bölümü eski veriyle devam ediyor')
  }
  for (const k of ham) {
    const tarih = (k.createdAt || '').slice(0, 10)
    if (!tarih || tarih !== BUGUN) continue
    const sonuc = k.conclusion || k.status || 'bilinmiyor'
    const anahtar = `${tarih}\t${k.name}\t${sonuc}`
    const sure = k.startedAt && k.updatedAt ? (Date.parse(k.updatedAt) - Date.parse(k.startedAt)) / 1000 : 0
    const [adet, saniye] = gorulen.get(anahtar) ?? [0, 0]
    gorulen.set(anahtar, [adet + 1, saniye + Math.max(0, sure)])
  }
  for (const [k, v] of gorulen) kosuDefter.set(k, v)
  // Botun "şu an" durumu: en son koşusunun sonucu.
  for (const k of [...ham].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) {
    if (k.name) sonKosu.set(k.name, { sonuc: k.conclusion || k.status, ne_zaman: k.createdAt })
  }
}

const kosuKayit = [...kosuDefter.entries()]
  .map(([k, v]) => {
    const [tarih, ad, sonuc] = k.split('\t')
    return { tarih, ad, sonuc, adet: v[0], saniye: v[1] }
  })
  .sort((a, b) => b.tarih.localeCompare(a.tarih) || a.ad.localeCompare(b.ad))

writeFileSync(
  KOSU_TSV,
  kosuKayit.map((r) => [r.tarih, r.ad, r.sonuc, r.adet, Math.round(r.saniye)].join('\t')).join('\n') + '\n',
)

// --------------------------------------------------------------------- para
const fiyatiVar = (model) => Boolean(FIYAT[model] || (model.startsWith('gemini/') && GG))
// Önbellek: yazım girdi fiyatının 1,25 katı (5 dk), okuma 0,10 katı.
const usd = (model, g, c, oy = 0, oo = 0) => {
  const f = FIYAT[model] ?? (model.startsWith('gemini/') && GG ? [GG, GC] : null)
  return f ? (g / 1e6) * f[0] + (c / 1e6) * f[1] + (oy / 1e6) * f[0] * 1.25 + (oo / 1e6) * f[0] * 0.1 : 0
}
const eksikFiyat = [...new Set(kayitlar.filter((r) => !fiyatiVar(r.model)).map((r) => r.model))]

const saglayici = (model) => model.split('/')[0]
const AY = BUGUN.slice(0, 7)
const buAy = kayitlar.filter((r) => r.tarih.startsWith(AY))
const ayUsd = buAy.reduce((t, r) => t + usd(r.model, r.girdi, r.cikti, r.onyaz, r.onoku), 0)
const ayToken = buAy.reduce((t, r) => t + r.girdi + r.cikti + r.onyaz + r.onoku, 0)
const gecenGun = Math.max(1, Number(BUGUN.slice(8, 10)))
const gidis = (ayUsd / gecenGun) * 30

// Günlük toplamlar, sağlayıcıya ayrılmış — grafiğin yığın katmanları bunlar.
const gunler = new Map()
for (const r of kayitlar) {
  const g = gunler.get(r.tarih) ?? { tarih: r.tarih, token: 0, usd: 0, eksik: false, pay: {} }
  g.token += r.girdi + r.cikti + r.onyaz + r.onoku
  const s = saglayici(r.model)
  const d = usd(r.model, r.girdi, r.cikti, r.onyaz, r.onoku)
  g.usd += d
  g.pay[s] = (g.pay[s] || 0) + (d || (r.girdi + r.cikti) / 1e6)
  if (!fiyatiVar(r.model)) g.eksik = true
  gunler.set(r.tarih, g)
}
const gunListe = [...gunler.values()].sort((a, b) => a.tarih.localeCompare(b.tarih)).slice(-30)

const kosuGun = new Map()
for (const r of kosuKayit) {
  const g = kosuGun.get(r.tarih) ?? { tarih: r.tarih, basarili: 0, dusen: 0, diger: 0, saniye: 0 }
  if (r.sonuc === 'success') g.basarili += r.adet
  else if (r.sonuc === 'failure' || r.sonuc === 'timed_out') g.dusen += r.adet
  else g.diger += r.adet
  g.saniye += r.saniye
  kosuGun.set(r.tarih, g)
}
const kosuListe = [...kosuGun.values()].sort((a, b) => a.tarih.localeCompare(b.tarih)).slice(-30)

const dk = kosuKayit.filter((r) => r.tarih.startsWith(AY)).reduce((t, r) => t + r.saniye, 0) / 60

// ------------------------------------------------------------------ kanallar
// Hattın faturasına tek başına bakmak yanıltıyor: aynı ay içinde token
// harcayan üç kanal var ve pahalı olan hat değil. `docs/kanallar.tsv` elle
// tutulan defterdir — Actions dışında kalan ölçümler oraya yazılır.
//
// DİKKAT: hat dışındaki dolar **API fiyatı karşılığıdır**, kesilen fatura
// değil. Abonelikle koşan bir oturum abonelik kotasından düşer; buradaki
// rakam "aynı iş API'den alınsaydı" sorusunun yanıtı. Karşılaştırmanın
// anlamı mutlak tutarda değil, kanallar arasındaki oranda.
const ONBELLEK_YAZ = 1.25 // girdi fiyatının katı
const ONBELLEK_OKU = 0.1
const kanalUsd = (model, g, c, oy, oo) => {
  const f = FIYAT[model] ?? (model.startsWith('gemini/') && GG ? [GG, GC] : null)
  if (!f) return 0
  return (
    (g / 1e6) * f[0] +
    (c / 1e6) * f[1] +
    (oy / 1e6) * f[0] * ONBELLEK_YAZ +
    (oo / 1e6) * f[0] * ONBELLEK_OKU
  )
}

const kanallar = new Map()
const kanalEkle = (ad, para, token) => {
  const k = kanallar.get(ad) ?? { ad, usd: 0, token: 0, adet: 0 }
  k.usd += para
  k.token += token
  k.adet += 1
  kanallar.set(ad, k)
}
// Hat kanalı deftere ayrıca yazılmaz; Actions'ın kendi kayıtlarından türer.
for (const r of buAy) kanalEkle('hat', usd(r.model, r.girdi, r.cikti, r.onyaz, r.onoku), r.girdi + r.cikti + r.onyaz + r.onoku)
for (const satir of oku(KANAL).split('\n')) {
  const p = satir.split('\t')
  if (p.length < 7 || !/^\d{4}-\d\d-\d\d$/.test(p[0]) || !p[0].startsWith(AY)) continue
  const n = (v) => Number(v) || 0
  kanalEkle(p[1], kanalUsd(p[2], n(p[3]), n(p[4]), n(p[5]), n(p[6])), n(p[3]) + n(p[4]) + n(p[5]) + n(p[6]))
}
const kanalListe = [...kanallar.values()].sort((a, b) => b.usd - a.usd)
const kanalToplam = kanalListe.reduce((t, k) => t + k.usd, 0)
const kanalTavan = kanalListe.length ? kanalListe[0].usd : 0
const KANAL_AD = { hat: 'Hat (Actions)', asistan: 'Yerel asistan', ultracode: 'Ultracode koşuları' }
const kanalAdi = (a) => KANAL_AD[a] ?? a
// "Hat kaç katı ucuz" — oran, mutlak tutardan daha çok şey söylüyor.
const hatUsd = kanallar.get('hat')?.usd ?? 0
const kat = (v) => (hatUsd > 0 && v > 0 ? `${Math.round(v / hatUsd)}×` : '—')

// ------------------------------------------------------------------ MALIYET.md
const $ = (n) => `$${n.toFixed(2)}`
const bin = (n) => n.toLocaleString('tr-TR')

const md = `# Maliyet

> Bu sayfayı \`Maliyet sayacı\` iş akışı her gün yeniden yazar. Elle düzenleme.
> Grafikli hâli: \`docs/maliyet.html\` — yerelde \`npm run maliyet\` ile tazelenir.

## Bu ay (${AY})

| | |
|---|---|
| LLM harcaması | **${$(ayUsd)}**${eksikFiyat.length ? ' + fiyatı ayarlanmamış modeller' : ''} |
| Ay sonu gidişi | ${$(gidis)} |
| Token | ${bin(ayToken)} |
| Actions dakikası | ${Math.round(dk)} |

${
  eksikFiyat.length
    ? `> **Fiyatı ayarlanmamış model:** ${eksikFiyat.join(', ')}. Rakam uydurulmuyor —\n` +
      `> ilk gerçek faturadan okunup \`GEMINI_GIRDI\` / \`GEMINI_CIKTI\` depo\n` +
      `> değişkenlerine (milyon token başına dolar) girilmeli.\n`
    : ''
}
## Kanallar (${AY})

Aynı ay içinde token harcayan kanallar. Hattın faturası bunlardan yalnızca biri.

| Kanal | Harcama | Payı | Hattın katı | Token | Çağrı |
|---|---|---|---|---|---|
${kanalListe
  .map(
    (k) =>
      `| ${kanalAdi(k.ad)} | ${$(k.usd)} | ${kanalToplam ? Math.round((k.usd / kanalToplam) * 100) : 0}% | ${k.ad === 'hat' ? '—' : kat(k.usd)} | ${bin(k.token)} | ${k.adet} |`,
  )
  .join('\n')}

> Hat dışındaki dolar **API fiyatı karşılığıdır**, kesilen fatura değil:
> abonelikle koşan bir oturum abonelik kotasından düşer. Anlamlı olan mutlak
> tutar değil, kanallar arasındaki oran. "Kat" sütunu hattın kaç misli.

## Günlük

| Tarih | Harcama | Token | Koşu | Modeller |
|---|---|---|---|---|
${[...gunler.values()]
  .sort((a, b) => b.tarih.localeCompare(a.tarih))
  .slice(0, 30)
  .map((g) => {
    const k = kosuGun.get(g.tarih)
    const modeller = kayitlar.filter((r) => r.tarih === g.tarih).map((r) => r.model)
    return `| ${g.tarih} | ${g.usd ? $(g.usd) : '—'}${g.eksik ? ' +' : ''} | ${bin(g.token)} | ${k ? k.basarili + k.dusen + k.diger : 0} | ${[...new Set(modeller)].join(', ')} |`
  })
  .join('\n')}
`
writeFileSync(MD, md)
console.error(`maliyet: ${cagri} çağrı, ${gunler.size} gün, bu ay ${$(ayUsd)}`)

// ------------------------------------------------------------- maliyet.html
// Yerelde açılan grafikli yüz. Tek dosya, dış bağımlılık yok: veri HTML'in
// içine gömülüyor. Sebep — file:// üzerinden açılan bir sayfa yanındaki
// dosyayı okuyamaz; sunucu kurmak "yerelde aç" isteğini bozar.

const RENK = {
  gemini: ['#2a78d6', '#3987e5'],
  claude: ['#eb6834', '#d95926'],
  diger: ['#1baf7a', '#199e70'],
}
const renkAdi = (s) => (RENK[s] ? s : 'diger')
const saglayicilar = [...new Set(kayitlar.map((r) => saglayici(r.model)))].sort()

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Yığın çubuk grafiği. Katmanlar arasında 2px zemin boşluğu, veri ucu 4px
// yuvarlatılmış ve tabana çakılı; eksen ve ızgara geri planda.
function cubuk({ veri, katmanlar, baslik, birim, bicim }) {
  const W = 720
  const H = 210
  const SOL = 52
  const ALT = 26
  const UST = 8
  const enBuyuk = Math.max(1, ...veri.map((g) => katmanlar.reduce((t, k) => t + (k.al(g) || 0), 0)))
  const alan = H - ALT - UST
  const adim = (W - SOL) / Math.max(1, veri.length)
  const genislik = Math.min(26, Math.max(4, adim - 6))

  const y = (v) => UST + alan - (v / enBuyuk) * alan
  const isaretler = [0, enBuyuk / 2, enBuyuk]
    .map(
      (v) =>
        `<line x1="${SOL}" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="izgara"/>` +
        `<text x="${SOL - 8}" y="${(y(v) + 4).toFixed(1)}" class="eksen" text-anchor="end">${bicim(v)}</text>`,
    )
    .join('')

  const cubuklar = veri
    .map((g, i) => {
      const x = SOL + i * adim + (adim - genislik) / 2
      let taban = UST + alan
      const parcalar = katmanlar
        .map((k) => {
          const v = k.al(g) || 0
          if (v <= 0) return ''
          const h = (v / enBuyuk) * alan
          taban -= h
          // 2px zemin boşluğu katmanları ayırır; renk tek ayırt edici olmasın.
          const yuk = Math.max(1, h - 2)
          return `<rect x="${x.toFixed(1)}" y="${taban.toFixed(1)}" width="${genislik}" height="${yuk.toFixed(1)}" rx="3" fill="var(--${k.renk})"/>`
        })
        .join('')
      const toplam = katmanlar.reduce((t, k) => t + (k.al(g) || 0), 0)
      const ipucu = `${g.tarih} · ${katmanlar.map((k) => `${k.ad}: ${bicim(k.al(g) || 0)}`).join(' · ')}`
      return (
        `<g class="sutun" data-ipucu="${esc(ipucu)}">` +
        `<rect x="${(SOL + i * adim).toFixed(1)}" y="${UST}" width="${adim.toFixed(1)}" height="${alan}" fill="transparent"/>` +
        parcalar +
        (toplam > 0 && (i === veri.length - 1 || veri.length <= 10)
          ? `<text x="${(x + genislik / 2).toFixed(1)}" y="${(y(toplam) - 6).toFixed(1)}" class="ucEtiket" text-anchor="middle">${bicim(toplam)}</text>`
          : '') +
        `</g>`
      )
    })
    .join('')

  const gunEtiket = veri
    .map((g, i) =>
      i === 0 || i === veri.length - 1 || (veri.length > 6 && i === Math.floor(veri.length / 2))
        ? `<text x="${(SOL + i * adim + adim / 2).toFixed(1)}" y="${H - 8}" class="eksen" text-anchor="middle">${g.tarih.slice(5)}</text>`
        : '',
    )
    .join('')

  return `<figure class="kart">
  <figcaption><h2>${esc(baslik)}</h2><span class="alt">${esc(birim)}</span></figcaption>
  <div class="efsane">${katmanlar.map((k) => `<span class="rozet"><i style="background:var(--${k.renk})"></i>${esc(k.ad)}</span>`).join('')}</div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(baslik)}" preserveAspectRatio="none">
    <line x1="${SOL}" x2="${W}" y1="${UST + alan}" y2="${UST + alan}" class="taban"/>
    ${isaretler}${cubuklar}${gunEtiket}
  </svg>
</figure>`
}

const DURUM = { success: ['iyi', 'başarılı'], failure: ['kritik', 'düştü'], timed_out: ['kritik', 'zaman aşımı'], cancelled: ['ciddi', 'iptal'], skipped: ['sessiz', 'atlandı'] }
const durumRozet = (s) => {
  const [sinif, etiket] = DURUM[s] ?? ['sessiz', s || 'bilinmiyor']
  const ikon = { iyi: '●', kritik: '▲', ciddi: '◆', sessiz: '○' }[sinif]
  return `<span class="durum ${sinif}"><b aria-hidden="true">${ikon}</b>${esc(etiket)}</span>`
}

const botlar = [...sonKosu.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const bugunSayim = (ad) => kosuKayit.filter((r) => r.tarih === BUGUN && r.ad === ad)

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vault · Maliyet</title>
<style>
:root{color-scheme:light;
--zemin:#f9f9f7;--kart:#fcfcfb;--mürekkep:#0b0b0b;--ikincil:#52514e;--soluk:#898781;
--izgara:#e1e0d9;--taban:#c3c2b7;--cerceve:rgba(11,11,11,.10);
--gemini:#2a78d6;--claude:#eb6834;--diger:#1baf7a;
--iyi:#0ca30c;--uyari:#fab219;--ciddi:#ec835a;--kritik:#d03b3b;--sessiz:#898781;}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
--zemin:#0d0d0d;--kart:#1a1a19;--mürekkep:#fff;--ikincil:#c3c2b7;--soluk:#898781;
--izgara:#2c2c2a;--taban:#383835;--cerceve:rgba(255,255,255,.10);
--gemini:#3987e5;--claude:#d95926;--diger:#199e70;}}
:root[data-theme="dark"]{color-scheme:dark;
--zemin:#0d0d0d;--kart:#1a1a19;--mürekkep:#fff;--ikincil:#c3c2b7;--soluk:#898781;
--izgara:#2c2c2a;--taban:#383835;--cerceve:rgba(255,255,255,.10);
--gemini:#3987e5;--claude:#d95926;--diger:#199e70;}
*{box-sizing:border-box}
body{margin:0;background:var(--zemin);color:var(--mürekkep);
font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:28px 20px 64px}
main{max-width:780px;margin:0 auto}
header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:22px;flex-wrap:wrap}
h1{font-size:19px;margin:0;letter-spacing:-.01em}
.zaman{color:var(--soluk);font-size:13px}
.kutular{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:22px}
.kutu{background:var(--kart);border:1px solid var(--cerceve);border-radius:14px;padding:14px 16px}
.kutu .ad{color:var(--ikincil);font-size:12.5px;margin-bottom:6px}
.kutu .deger{font-size:26px;font-weight:650;letter-spacing:-.02em}
.kutu.hero .deger{font-size:38px}
.kutu .not{color:var(--soluk);font-size:12px;margin-top:4px}
.kart{background:var(--kart);border:1px solid var(--cerceve);border-radius:14px;padding:16px;margin:0 0 18px}
figcaption{display:flex;align-items:baseline;gap:10px;margin-bottom:2px}
h2{font-size:14.5px;margin:0;font-weight:620}
.alt{color:var(--soluk);font-size:12px}
.efsane{display:flex;gap:14px;margin:8px 0 10px;flex-wrap:wrap}
.rozet{display:inline-flex;align-items:center;gap:6px;color:var(--ikincil);font-size:12.5px}
.rozet i{width:9px;height:9px;border-radius:3px;display:inline-block}
svg{width:100%;height:210px;display:block;overflow:visible}
.izgara{stroke:var(--izgara);stroke-width:1}
.taban{stroke:var(--taban);stroke-width:1}
.eksen{fill:var(--soluk);font-size:10.5px;font-variant-numeric:tabular-nums}
.ucEtiket{fill:var(--ikincil);font-size:10.5px;font-weight:600}
.sutun{cursor:default}
.sutun:hover rect[fill^="var"]{opacity:.82}
.durum{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ikincil)}
.durum b{font-size:11px}
.durum.iyi b{color:var(--iyi)}.durum.kritik b{color:var(--kritik)}
.durum.ciddi b{color:var(--ciddi)}.durum.sessiz b{color:var(--sessiz)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:right;padding:7px 8px;border-bottom:1px solid var(--izgara);font-variant-numeric:tabular-nums}
th:first-child,td:first-child{text-align:left;font-variant-numeric:normal}
th{color:var(--soluk);font-weight:550;font-size:12px}
.sarmal{overflow-x:auto}
.kanallar{display:flex;flex-direction:column;gap:9px;margin:12px 0 16px}
.kanal{display:grid;grid-template-columns:minmax(96px,150px) 1fr auto;align-items:center;gap:12px}
.kanal-ad{color:var(--ikincil);font-size:12.5px}
.kanal-yol{background:var(--izgara);border-radius:4px;height:16px;overflow:hidden}
.kanal-dolgu{height:100%;border-radius:4px;background:var(--soluk)}
.kanal-dolgu.hat{background:var(--gemini)}
.kanal-dolgu.asistan{background:var(--claude)}
.kanal-dolgu.ultracode{background:var(--diger)}
.kanal-deger{font-size:13px;font-weight:620;font-variant-numeric:tabular-nums;min-width:66px;text-align:right}
.uyari-kutu{background:var(--kart);border:1px solid var(--cerceve);border-left:3px solid var(--uyari);
border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:13.5px;color:var(--ikincil)}
#ipucu{position:fixed;pointer-events:none;opacity:0;transition:opacity .1s;background:var(--mürekkep);
color:var(--zemin);padding:6px 9px;border-radius:8px;font-size:12px;z-index:9;white-space:nowrap}
</style></head><body><main>

<header>
  <h1>Vault · hattın faturası</h1>
  <span class="zaman">${BUGUN} · ${AY} ayı</span>
</header>

${
  eksikFiyat.length
    ? `<div class="uyari-kutu"><b>Fiyatı ayarlanmamış model:</b> ${esc(eksikFiyat.join(', '))}.
   Rakam uydurulmuyor — ilk gerçek faturadan okunup <code>GEMINI_GIRDI</code> /
   <code>GEMINI_CIKTI</code> (milyon token başına dolar) olarak girilmeli. O zamana kadar
   bu modeller token olarak sayılıyor, dolara katılmıyor.</div>`
    : ''
}

<div class="kutular">
  <div class="kutu hero"><div class="ad">Bu ay LLM harcaması</div>
    <div class="deger">${$(ayUsd)}</div>
    <div class="not">ay sonu gidişi ${$(gidis)}</div></div>
  <div class="kutu"><div class="ad">Token</div><div class="deger">${bin(ayToken)}</div>
    <div class="not">${bin(kayitlar.filter((r) => r.tarih.startsWith(AY)).reduce((t, r) => t + r.girdi, 0))} girdi</div></div>
  <div class="kutu"><div class="ad">Actions</div><div class="deger">${Math.round(dk)}<span style="font-size:15px;color:var(--soluk)"> dk</span></div>
    <div class="not">bu ay</div></div>
  <div class="kutu"><div class="ad">Koşu</div>
    <div class="deger">${kosuKayit.filter((r) => r.tarih.startsWith(AY)).reduce((t, r) => t + r.adet, 0)}</div>
    <div class="not">${kosuKayit.filter((r) => r.tarih.startsWith(AY) && (r.sonuc === 'failure' || r.sonuc === 'timed_out')).reduce((t, r) => t + r.adet, 0)} düşen</div></div>
</div>

${
  gunListe.length
    ? cubuk({
        veri: gunListe,
        // Eskiden burada yalnızca `.length`'i için bir map kuruluyordu ve
        // içindeki `al` hiç çağrılmıyordu; ölçtüğü sayı zaten dizinin kendi
        // uzunluğuydu. Ölü kod, lint uyarısı üretiyordu.
        katmanlar: saglayicilar.length
          ? saglayicilar.map((s) => ({
              ad: s,
              renk: renkAdi(s),
              al: (g) =>
                kayitlar
                  .filter((r) => r.tarih === g.tarih && saglayici(r.model) === s)
                  .reduce((t, r) => t + r.girdi + r.cikti, 0),
            }))
          : [],
        baslik: 'Günlük token',
        birim: 'sağlayıcıya göre yığılmış',
        bicim: (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : Math.round(v)),
      })
    : '<div class="kart"><h2>Günlük token</h2><p style="color:var(--soluk);font-size:13px">Henüz kayıt yok. İlk LLM çağrısından sonra dolar.</p></div>'
}

${
  kosuListe.length
    ? cubuk({
        veri: kosuListe,
        katmanlar: [
          { ad: 'başarılı', renk: 'iyi', al: (g) => g.basarili },
          { ad: 'düşen', renk: 'kritik', al: (g) => g.dusen },
          { ad: 'diğer', renk: 'sessiz', al: (g) => g.diger },
        ],
        baslik: 'Günlük koşu',
        birim: 'sonuca göre yığılmış',
        bicim: (v) => String(Math.round(v)),
      })
    : ''
}

${
  kanalListe.length
    ? `<section class="kart">
  <figcaption><h2>Kanallar</h2><span class="alt">${AY} · aynı ayda token harcayan kanallar</span></figcaption>
  <div class="kanallar">${kanalListe
    .map(
      (k) => `<div class="kanal">
      <div class="kanal-ad">${esc(kanalAdi(k.ad))}</div>
      <div class="kanal-yol"><div class="kanal-dolgu ${esc(k.ad)}" style="width:${kanalTavan ? Math.max(1.5, (k.usd / kanalTavan) * 100) : 0}%"></div></div>
      <div class="kanal-deger">${$(k.usd)}</div>
    </div>`,
    )
    .join('')}</div>
  <div class="sarmal"><table>
    <thead><tr><th>Kanal</th><th>Harcama</th><th>Payı</th><th>Hattın katı</th><th>Token</th><th>Çağrı</th></tr></thead>
    <tbody>${kanalListe
      .map(
        (k) =>
          `<tr><td>${esc(kanalAdi(k.ad))}</td><td>${$(k.usd)}</td><td>${kanalToplam ? Math.round((k.usd / kanalToplam) * 100) : 0}%</td><td>${k.ad === 'hat' ? '—' : esc(kat(k.usd))}</td><td>${bin(k.token)}</td><td>${k.adet}</td></tr>`,
      )
      .join('')}</tbody>
  </table></div>
  <p class="alt" style="margin:10px 0 0;line-height:1.55">Hat dışındaki dolar <b>API fiyatı karşılığıdır</b>, kesilen fatura değil:
  abonelikle koşan bir oturum abonelik kotasından düşer. Anlamlı olan mutlak tutar değil, kanallar arasındaki oran.</p>
</section>`
    : ''
}

<section class="kart">
  <h2>Botların durumu</h2>
  <div class="sarmal"><table>
    <thead><tr><th>İş akışı</th><th>Son durum</th><th>Bugün</th><th>Düşen</th></tr></thead>
    <tbody>${
      botlar.length
        ? botlar
            .map(([ad, s]) => {
              const b = bugunSayim(ad)
              const top = b.reduce((t, r) => t + r.adet, 0)
              const dus = b.filter((r) => r.sonuc === 'failure' || r.sonuc === 'timed_out').reduce((t, r) => t + r.adet, 0)
              return `<tr><td>${esc(ad)}</td><td style="text-align:left">${durumRozet(s.sonuc)}</td><td>${top}</td><td>${dus || '—'}</td></tr>`
            })
            .join('')
        : '<tr><td colspan="4" style="color:var(--soluk)">Koşu envanteri yok.</td></tr>'
    }</tbody>
  </table></div>
</section>

<section class="kart">
  <h2>Günlük döküm</h2>
  <span class="alt">grafiklerin tablo karşılığı</span>
  <div class="sarmal"><table>
    <thead><tr><th>Tarih</th><th>Harcama</th><th>Token</th><th>Koşu</th><th>Actions dk</th></tr></thead>
    <tbody>${[...gunler.values()]
      .sort((a, b) => b.tarih.localeCompare(a.tarih))
      .slice(0, 30)
      .map((g) => {
        const k = kosuGun.get(g.tarih)
        return `<tr><td>${g.tarih}</td><td>${g.usd ? $(g.usd) : '—'}${g.eksik ? '<span style="color:var(--soluk)"> +</span>' : ''}</td><td>${bin(g.token)}</td><td>${k ? k.basarili + k.dusen + k.diger : 0}</td><td>${k ? Math.round(k.saniye / 60) : 0}</td></tr>`
      })
      .join('')}</tbody>
  </table></div>
</section>

<p class="zaman">Kaynak: her LLM çağrısının bildirdiği token (<code>.github/scripts/llm.sh</code>)
ve koşu envanteri. Tazelemek için <code>npm run maliyet</code>.</p>
</main>
<div id="ipucu"></div>
<script>
const kutu=document.getElementById('ipucu');
for(const s of document.querySelectorAll('.sutun')){
  s.addEventListener('pointerenter',e=>{kutu.textContent=s.dataset.ipucu;kutu.style.opacity=1});
  s.addEventListener('pointermove',e=>{
    const g=Math.min(e.clientX+14,innerWidth-kutu.offsetWidth-8);
    kutu.style.left=g+'px';kutu.style.top=(e.clientY-34)+'px'});
  s.addEventListener('pointerleave',()=>kutu.style.opacity=0);
}
</script>
</body></html>
`
writeFileSync(HTML, html)
console.error(`maliyet: pano yazıldı → ${HTML}`)
