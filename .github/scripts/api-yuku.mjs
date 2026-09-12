#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// İş akışlarının GitHub API çağrı yükünü **koşu başına** çıkarır.
//
// Neden statik sayım: kurulum (installation) kotası tükendiğinde hata ilk
// çağrıda patlıyor ve o çağrının hangi kol tarafından yapıldığı log'da
// görünmüyor. Çalışma anında saymak için her adımı sarmalamak gerekirdi;
// sarmalanmayan tek adım sayacı sessizce eksik bırakır — bu hattın maliyet
// defterinde ölçülmüş bir arıza sınıfı ("ölçülmeyen harcama, olmayan harcama
// gibi görünür"). Kaynak metni saymak eksik kalamaz: bir çağrı ya dosyada
// yazılıdır ya değildir.
//
// Sayımın söylemediği şey de yazılı: bu, çağrının **kaç kez yazıldığını**
// ölçer, kaç puan yaktığını değil. GraphQL kotası düğüm sayısına göre puan
// biçiyor ve `--paginate` sayfa başına bir istek atıyor. Bu yüzden sayfalanan
// çağrılar ayrı bir sütunda duruyor: onlar "1" değil, "veri kadar" eder.
//
//   node .github/scripts/api-yuku.mjs
//   node .github/scripts/api-yuku.mjs --json
//   node .github/scripts/api-yuku.mjs --akis pr-nanny.yml

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIZIN = '.github/workflows'

// API'ye giden `gh` alt komutları. Yalnızca ağa çıkanlar: `gh auth status`
// gibi yerel komutlar listede yok. Liste eksikse sayım az gösterir, bu
// yüzden tanınmayan her `gh` çağrısı ayrıca raporlanıyor (aşağıda).
//
// `ad` alanı yok ve olmamalı: çağrının adı eşleşen desenin kendisinden
// türetiliyor (`ghCagrilari`). Ayrı bir ad şablonu tutmak, kod onu hiç
// okumadığı hâlde bakımcıya okunuyormuş gibi görünen ölü bir alan bırakıyordu
// — yeni bir alt komut eklendiğinde güncellenir ama hiçbir şeye yaramazdı
// (denetimin 3 numaralı bulgusu).
const KOMUTLAR = [
  { desen: /^gh\s+api\s+graphql\b/, tur: 'graphql' },
  { desen: /^gh\s+api\b/, tur: 'rest' },
  { desen: /^gh\s+(pr|issue)\s+(list|view)\b/, tur: 'graphql' },
  { desen: /^gh\s+(pr|issue)\s+(comment|edit|create|close|reopen)\b/, tur: 'rest' },
  { desen: /^gh\s+run\s+(list|view)\b/, tur: 'rest' },
  { desen: /^gh\s+run\s+rerun\b/, tur: 'rest' },
  { desen: /^gh\s+workflow\s+run\b/, tur: 'rest' },
  { desen: /^gh\s+search\b/, tur: 'graphql' },
  { desen: /^gh\s+label\s+\w+/, tur: 'rest' },
]

// Bir `run:` bloğunun içindeki kabuk satırlarını, döngü derinliğiyle birlikte
// verir. Derinlik sıfır = koşu başına bir kez; derinlik ≥1 = döngünün
// dönmesi kadar, yani açık PR/issue sayısıyla çarpılır.
//
// Ayrıştırıcı kabuğu yorumlamıyor, `for`/`while`/`done` sayıyor. Kabuk
// gramerinin tamamını çözmek gerekmiyor: aranan şey büyüklük sınıfı ("sabit
// mi, veriyle mi büyüyor"), tam sayı değil.
function* kabukSatirlari(icerik) {
  const satirlar = icerik.split('\n')
  let blokGirinti = null      // `run:` gövdesinin girintisi
  let derinlik = 0
  let adim = '(adsız)'

  for (const ham of satirlar) {
    const girinti = ham.length - ham.trimStart().length
    const satir = ham.trim()

    if (blokGirinti !== null && satir !== '' && girinti < blokGirinti) {
      blokGirinti = null        // blok bitti
      derinlik = 0
    }

    if (blokGirinti === null) {
      const ad = satir.match(/^-?\s*name:\s*(.+)$/)
      if (ad) adim = ad[1].replace(/^['"]|['"]$/g, '')
      if (/^run:\s*\|?-?\s*$/.test(satir)) blokGirinti = girinti + 1
      continue
    }

    if (satir === '' || satir.startsWith('#')) continue

    // Derinlik iki ayrı soruya cevap veriyor ve ikisi aynı değil: **bu
    // satırdaki komut** hangi derinlikte, ve **sonraki satırlar** hangi
    // derinlikte. Tek satırlık döngü ikisini ayırıyor.
    //
    // Eski kod önce kapanışı düşürüp satırı öyle yield ediyor, açılışı sonra
    // ekliyordu. `for i in 1 2 3; do gh api /b; done` satırında bu iki hata
    // birden üretiyordu — ölçüldü:
    //
    //   satır                                   beklenen  eskisi
    //   gh api /a                                      0       0
    //   for i in 1 2 3; do gh api /b; done             1       0  ✗
    //   gh api /c                                      0       1  ✗
    //   for i in 1 2; do … gh api /d … done            1       2  ✗
    //   gh api /e                                      0       1  ✗
    //
    // Yani tek bir tek-satırlık döngü, kendinden **sonraki her satırı** da
    // bozuyordu: kapanış düşürülüp açılış eklendiği için sayaç sıfıra
    // dönmüyor, 1'de kalıyordu. Beş satırın dördü yanlış.
    //
    // Doğrusu açılış ve kapanışı eşleştirmek: aynı satırda açılıp kapanan
    // döngü satırdaki komutu **kapsıyor** ama sonraki satırları etkilemiyor.
    const kapanis = (satir.match(/\bdone\b/g) || []).length
    const acilis = (satir.match(/(^|;|\bdo\b|&&|\|\|)\s*(for|while|until)\s/g) || []).length

    const ayniSatirda = Math.min(acilis, kapanis)   // açılıp aynı satırda kapanan
    const kalanKapanis = kapanis - ayniSatirda
    const kalanAcilis = acilis - ayniSatirda

    const tabanDerinlik = Math.max(0, derinlik - kalanKapanis)

    yield { satir, derinlik: tabanDerinlik + ayniSatirda, adim }

    derinlik = tabanDerinlik + kalanAcilis
  }
}

// Bir kabuk satırındaki `gh` çağrılarını çıkarır. Komut ikamesi (`$( ... )`),
// boru ve `&&` ile zincirlenmiş çağrılar ayrı ayrı sayılır: satırda kaç kez
// `gh` yazılıysa o kadar istek gider.
function ghCagrilari(satir) {
  const bulunan = []
  // Ayraçlar **tırnak dışında** ayraçtır. `gh api --jq '.msg | length'`
  // satırında boru bir jq operatörü; ayraç sayılırsa tek çağrı ikiye bölünür
  // ve ikinci parça (`length'`) `gh` ile başlamadığı için sessizce düşer —
  // yani sayım şişmiyor, **eksiliyor**.
  //
  // Tırnaklı bölümler bölmeden önce maskeleniyor, bölmeden sonra geri
  // konuyor. Maskede ayraç karakteri geçmediği için split onları görmüyor.
  const maskeler = []
  const maskeli = satir.replace(/'[^']*'|"[^"]*"/g, (m) => {
    maskeler.push(m)
    return `\u0000${maskeler.length - 1}\u0000`
  })
  const geriKoy = (t) => t.replace(/\u0000(\d+)\u0000/g, (_, i) => maskeler[Number(i)])
  const parcalar = maskeli.split(/\$\(|\)|\||&&|\|\||;/).map(geriKoy)
  for (const parca of parcalar) {
    // Baştaki kabuk anahtar sözcükleri atılıyor, ve `do` bunların en önemlisi:
    // derinlik düzeltmesi tek satırlık döngüyü doğru **derinlikte** sayıyor
    // ama çağrının kendisi hâlâ bulunamıyordu. `for i in 1 2 3; do gh api /b;
    // done` satırı `;` ile bölününce ortadaki parça `do gh api /b` oluyor,
    // `^gh` tutmuyor ve çağrı sessizce düşüyordu — yani doğru derinlikte
    // sayılan bir çağrı hiç sayılmıyordu. Bu, denetimin 1 numaralı bulgusunun
    // derinlikten sonraki yarısı (#607).
    //
    // Döngü, çünkü birden fazla sözcük üst üste gelebiliyor (`do ! gh …`).
    let kirp = parca.trim()
    let onceki
    do {
      onceki = kirp
      kirp = kirp.replace(/^!\s*/, '').replace(/^(if|then|else|elif|do|while|until)\s+/, '')
    } while (kirp !== onceki)
    if (!/^gh\s/.test(kirp)) continue
    const eslesme = KOMUTLAR.find((k) => k.desen.test(kirp))
    bulunan.push({
      ad: eslesme ? kirp.match(eslesme.desen)[0].replace(/\s+/g, ' ') : kirp.split(/\s+/).slice(0, 3).join(' '),
      tur: eslesme ? eslesme.tur : 'bilinmiyor',
      sayfali: /--paginate\b/.test(kirp),
    })
  }
  return bulunan
}

function akisOlc(yol) {
  const icerik = readFileSync(yol, 'utf8')
  const ad = (icerik.match(/^name:\s*(.+)$/m) || [, yol])[1].trim()
  const cronlar = [...icerik.matchAll(/^\s*-\s*cron:\s*['"]?([^'"\n]+)/gm)].map((m) => m[1].trim())

  const cagrilar = []
  for (const { satir, derinlik, adim } of kabukSatirlari(icerik)) {
    for (const c of ghCagrilari(satir)) cagrilar.push({ ...c, derinlik, adim })
  }

  const sabit = cagrilar.filter((c) => c.derinlik === 0)
  const dongu = cagrilar.filter((c) => c.derinlik > 0)
  return {
    dosya: yol.split('/').pop(),
    ad,
    cronlar,
    // Çözülen cron'ların toplamı; çözülemeyen varsa ayrıca işaretleniyor.
    // İkisini karıştırmak, eksik bir toplamı tam sanmak olurdu.
    gunlukKosu: cronlar.map(cronGunluk).filter((x) => x !== null).reduce((a, b) => a + b, 0) || null,
    cozulemeyenCron: cronlar.filter((c) => cronGunluk(c) === null),
    sabit: sabit.length,
    dongu: dongu.length,
    sayfali: cagrilar.filter((c) => c.sayfali).length,
    bilinmeyen: cagrilar.filter((c) => c.tur === 'bilinmiyor').map((c) => c.ad),
    cagrilar,
  }
}

// Yalnızca `*/N` ve sabit saat/dakika biçimlerini çözer; çözemediğinde null
// döner ve tablo o satırda "—" gösterir. Tahmin edip yanlış sayı yazmaktansa
// boş bırakmak: bu defterin kendi kuralı.
function cronGunluk(ifade) {
  // Çözülemeyen ifade `null` döner, **sıfır değil**. Fark ölçümün namusu:
  // sıfır "bu cron hiç koşmuyor" demek ve toplama sessizce 0 katıyor;
  // `@daily` taşıyan bir iş akışı günde 0 koşu gibi görünürdü (#607 denetimi).
  // `null` ise "bilmiyorum" demek ve çağıran bunu tabloda işaretliyor.
  const kisayol = { '@yearly': 1 / 365, '@annually': 1 / 365, '@monthly': 1 / 30,
                    '@weekly': 1 / 7, '@daily': 1, '@midnight': 1, '@hourly': 24 }
  const k = kisayol[ifade.trim().toLowerCase()]
  if (k !== undefined) return k

  const [dk, sa] = ifade.split(/\s+/)

  // Bir alanın kaç kez eşleştiği. Virgüllü liste (`0,30`) ve tire aralığı
  // (`9-17`) yaygın ve ikisi de eskiden `null` düşüyordu.
  const adim = (alan, tavan) => {
    if (alan === undefined) return null
    if (alan.includes(',')) {
      const parcalar = alan.split(',').map((x) => adim(x, tavan))
      return parcalar.some((x) => x === null) ? null : parcalar.reduce((a, b) => a + b, 0)
    }
    if (alan === '*') return tavan
    const bolum = alan.match(/^(\*|\d+-\d+)\/(\d+)$/)
    if (bolum) {
      const kapsam = bolum[1] === '*' ? tavan : Number(bolum[1].split('-')[1]) - Number(bolum[1].split('-')[0]) + 1
      return Math.floor(kapsam / Number(bolum[2]))
    }
    const aralik = alan.match(/^(\d+)-(\d+)$/)
    if (aralik) return Number(aralik[2]) - Number(aralik[1]) + 1
    if (/^\d+$/.test(alan)) return 1
    return null
  }

  const d = adim(dk, 60)
  const s = adim(sa, 24)
  return d === null || s === null ? null : d * s
}

// Sınama için dışa açılıyor: ikisi de saf fonksiyon ve ikisi de bir kez
// sessizce yanlış saydı (#607 denetim turu). Testi `api-yuku.test.mjs`.
export { kabukSatirlari, ghCagrilari, cronGunluk }

// Rapor yalnız betik **doğrudan** çağrıldığında basılıyor. Bu koruma olmadan
// `import` etmek raporu da koşturuyordu — testin çıktısı ölçüm metnine
// gömülüyor ve testin kendisi okunmaz oluyordu.
const dogrudanCagri = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (dogrudanCagri) {

const argv = process.argv.slice(2)
const secilen = argv.includes('--akis') ? argv[argv.indexOf('--akis') + 1] : null

const dosyalar = readdirSync(DIZIN)
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .filter((f) => !secilen || f === secilen)
  .sort()

const olcumler = dosyalar.map((f) => akisOlc(join(DIZIN, f))).filter((o) => o.sabit + o.dongu > 0)
olcumler.sort((a, b) => b.dongu + b.sabit - (a.dongu + a.sabit))

if (argv.includes('--json')) {
  process.stdout.write(JSON.stringify(olcumler, null, 2) + '\n')
  process.exit(0)
}

console.log('İş akışı başına API çağrısı — kaynak metinden sayıldı\n')
console.log('| İş akışı | Sabit/koşu | Döngü içi (×öğe) | Sayfalı | Günlük koşu |')
console.log('|---|---|---|---|---|')
for (const o of olcumler) {
  console.log(
    `| ${o.dosya} | ${o.sabit}${o.bilinmeyen.length ? `+${o.bilinmeyen.length}?` : ''} | ${o.dongu} | ${o.sayfali || '—'} | ${o.gunlukKosu ? `${Math.round(o.gunlukKosu * 10) / 10}${o.cozulemeyenCron.length ? '+?' : ''}` : o.cozulemeyenCron.length ? '?' : '—'} |`,
  )
}

console.log('\n`Döngü içi` sütunu açık PR/issue sayısıyla çarpılır: kuyruk')
console.log('büyüdükçe yük doğrusal büyür, koşu sayısı sabit kalsa bile.')
console.log('`Sayfalı` çağrılar tek istek değil — veri kadar istek eder.')

if (secilen) {
  const o = olcumler[0]
  if (o) {
    console.log(`\n${o.dosya} — çağrı dökümü:\n`)
    for (const c of o.cagrilar) {
      const yer = c.derinlik > 0 ? `döngü×${c.derinlik}` : 'sabit'
      console.log(`  [${yer}] ${c.ad}${c.sayfali ? ' --paginate' : ''}  — ${c.adim}`)
    }
  }
}

const bilinmeyenler = [...new Set(olcumler.flatMap((o) => o.bilinmeyen))]
if (bilinmeyenler.length) {
  console.log('\nTanınmayan `gh` çağrıları (sayıma girmedi, listeye eklenmeli):')
  for (const b of bilinmeyenler) console.log(`  ${b}`)
}

}
