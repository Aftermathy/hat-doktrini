#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// Ham nota göre kaynak dosyalarını ilgi sırasına dizer.
//
//   node .github/scripts/kaynak-sec.mjs --not not.txt --butce 160000 \
//        [--yollar "src supabase/migrations"] [--uzantilar "ts tsx sql"] \
//        [--sozluk src/locales/tr.json]
//
// stdout: seçilen dosya yolları, en ilgiliden başlayarak, bütçe kadar.
// stderr: hangi dosyanın hangi sebeple seçildiği — kesim denetlenebilir olsun.
//
// NEDEN VAR: kaynak dökümü prompt'a olduğu gibi basılıyordu. Kod tabanı
// büyüdükçe döküm de büyüdü ve 2026-08-17'de sağlayıcının dakikalık girdi
// tavanını aştı; triyaj o günden sonra tek bir başarılı koşu üretmedi.
// Dökümü kırpmak şart, ama alfabetik kırpmak seçimi alfabeye bırakır:
// "banka PDF'i okunmuyor" notu, OcrSheet.tsx'i hiç görmeden şartnameye
// çevrilirdi. Tavan fiziksel; asıl karar tavanı NEYE harcadığımız.

import { readFileSync, readdirSync } from 'node:fs'
import { join, extname, basename, dirname, resolve, relative } from 'node:path'

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf(`--${ad}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : varsayilan
}

const NOT_DOSYASI = arg('not')
const BUTCE = Number(arg('butce', 160000))
const YOLLAR = arg('yollar', 'src').split(/\s+/).filter(Boolean)
const UZANTILAR = arg('uzantilar', 'ts tsx sql').split(/\s+/).filter(Boolean)
const SOZLUK = arg('sozluk', '')
const ONCELIK = arg('oncelik', '')
// Hiçbir şartnameye katkısı olmayan dosyalar. Testler bunun tipik örneği:
// modelin ne yazacağını değil, yazılmışın doğrulanmasını anlatırlar.
const HARIC = arg('haric', '').split(/\s+/).filter(Boolean)
// Notla ilgisine bakılmaksızın her zaman gönderilecek dosyalar. Kök
// bileşen, ortak tipler, ana bağlamlar: bunlar "hangi ekran ne zaman
// açılır", "bu alanın tipi ne" gibi soruları yanıtlar ve yokluklarında
// model doğru dosyayı görse bile yanlış yere bağlar. Sıralamaya
// bırakılmayacak kadar temel oldukları için bütçenin önünde dururlar.
const HER_ZAMAN = arg('her-zaman', '').split(/\s+/).filter(Boolean)

// Kesime uğramayacak dosyalar. Puan vermek yetmez: bütçe önce dolarsa
// yüksek puanlı dosya da düşer. Belge "notta adı geçen dosya asla
// kesilmez" diye söz veriyor; sözü tutan yer burası olmalı, sıralama değil.
const ZORUNLU = new Set()

if (!NOT_DOSYASI) {
  console.error('kaynak-sec: --not <dosya> gerekli')
  process.exit(2)
}

const not = readFileSync(NOT_DOSYASI, 'utf8')

// ---------------------------------------------------------------- dosyalar

function dosyalariTopla(kok) {
  const cikti = []
  let girisler
  try {
    girisler = readdirSync(kok, { withFileTypes: true })
  } catch {
    return cikti
  }
  for (const g of girisler) {
    const yol = join(kok, g.name)
    if (g.isDirectory()) {
      if (g.name === 'node_modules' || g.name.startsWith('.')) continue
      cikti.push(...dosyalariTopla(yol))
      // Yalnızca gerçek dosya. Sembolik bağlantı ne dizindir ne dosya, ama
      // readFileSync hedefini okur: depoya `src/x.ts -> ../../gizli` diye bir
      // bağlantı girerse içeriği dökümle birlikte modele gider.
    } else if (g.isFile() && UZANTILAR.includes(extname(g.name).slice(1))) {
      if (HARIC.some((k) => g.name.endsWith(k))) continue
      cikti.push(yol)
    }
  }
  return cikti
}

const dosyalar = YOLLAR.flatMap(dosyalariTopla).sort()
if (dosyalar.length === 0) {
  console.error(`kaynak-sec: kaynak bulunamadı — yollar: ${YOLLAR.join(' ')}`)
  process.exit(1)
}

const icerik = new Map()
const boyut = new Map()
for (const f of dosyalar) {
  let m = ''
  try {
    m = readFileSync(f, 'utf8')
  } catch {
    m = ''
  }
  icerik.set(f, m)
  boyut.set(f, Buffer.byteLength(m, 'utf8'))
}

const puan = new Map(dosyalar.map((f) => [f, 0]))
const sebep = new Map(dosyalar.map((f) => [f, []]))
const ekle = (f, p, neden) => {
  if (!puan.has(f)) return
  puan.set(f, puan.get(f) + p)
  const s = sebep.get(f)
  if (s.length < 4 && !s.includes(neden)) s.push(neden)
}

// Türkçe büyük/küçük ve aksan farkları eşleşmeyi bozar: "PDF"/"pdf",
// "Takvim"/"takvim", "İşlem"/"islem" aynı sözcüktür.
const sadelestir = (s) =>
  s
    // toLowerCase büyük İ'yi "i + birleşik nokta"ya çevirir ve ondan
    // sonraki değiştirme artık eşleşmez; İ önce sadeleşmeli.
    .replaceAll('İ', 'I')
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')


// ------------------------------------------------------- ayırt etme gücü
// "import", "yalnızca", "bugün" gibi sözcükler neredeyse her dosyada geçer:
// eşleşmeleri doğrudur ama hiçbir şey söylemez. Puan verirlerse en çok
// sözcük barındıran dosya, yani en büyük dosya öne çıkar — #308'de tam
// olarak bu oldu: takvim notu AddGoalSheet.tsx'i birinci sıraya taşıdı.
// Terimi kaç dosyanın paylaştığına bakıp ağırlığı ona göre veriyoruz.

const sadeIcerik = new Map(dosyalar.map((f) => [f, sadelestir(icerik.get(f))]))
const dfOnbellek = new Map()
const df = (terim) => {
  if (dfOnbellek.has(terim)) return dfOnbellek.get(terim)
  let n = 0
  for (const f of dosyalar) if (sadeIcerik.get(f).includes(terim)) n++
  dfOnbellek.set(terim, n)
  return n
}
// 1.0 = tek dosyada geçen nadir terim, 0 = dosyaların dörtte birinden
// fazlasında geçen terim.
const ayirtEtme = (terim) => {
  const n = df(terim)
  if (n === 0) return 0
  if (n > dosyalar.length * 0.25) return 0
  return Math.log(dosyalar.length / n) / Math.log(dosyalar.length)
}

// ----------------------------------------------- 0. katman: model seçimi
// Sezgisel katmanlar dilden ve adlandırmadan beslenir; not saf arayüz
// Türkçesiyle yazıldığında ("takvimde ay değiştirme yatay kaydırmayla")
// hiçbiri tutmaz. Modelin kendisi dosya listesine bakıp seçebiliyor ve bu
// seçim ucuz: liste 1.500 token, ücretsiz katmanın tavanının yüzde biri.
//
// Seçim ÖNERİDİR, emir değil: model var olmayan dosya uydurabilir, o
// yüzden listeye karşı doğrulanır. Çağrı düşerse (kota, kesinti) sezgisel
// katmanlar tek başına çalışmaya devam eder — seçim yapılamadı diye iş
// ertelenmez.

if (ONCELIK) {
  let secilenler = []
  try {
    secilenler = readFileSync(ONCELIK, 'utf8').split(/\r?\n/)
  } catch {
    console.error(`kaynak-sec: öncelik listesi okunamadı, sezgisel sıralamayla devam: ${ONCELIK}`)
  }
  let gecerli = 0
  let uydurma = 0
  for (const satir of secilenler) {
    const yol = satir.trim().replace(/^[-*\d.\s]+/, '').replace(/[`'"]/g, '').split(/[:\s]/)[0]
    if (!yol) continue
    if (puan.has(yol)) {
      ekle(yol, 800, 'model seçti')
      gecerli++
    } else uydurma++
  }
  console.error(`kaynak-sec: model ${gecerli} dosya seçti${uydurma ? `, ${uydurma} uydurma yol elendi` : ''}`)
}

// ------------------------------------------------- 1. katman: açık atıf
// Not zaten dosya adı veriyorsa tartışma yok: o dosya gider. Sahibin ve
// önceki ajanların yazdığı notlar sık sık "src/lib/ocrDocument.ts:95-142"
// biçiminde tam adres taşıyor; bunu okumamak elde olanı çöpe atmaktır.

// Uzantılar uzundan kısaya diziliyor ve desenin sonuna sınır konuyor.
// Alternasyon ilk tutanı alır: `.agentrc` sırası "ts tsx" olduğu için
// "Ekran.tsx" atfı "Ekran.ts" diye kesiliyor, o yol dosya listesinde
// bulunmadığı için katman hiç puan vermiyordu. Bu projede dosyaların çoğu
// .tsx; katman en çok gerektiği yerde sessizce ölüydü.
const atifDeseni = new RegExp(
  `(?:${YOLLAR.map((y) => y.replaceAll('/', '\\/')).join('|')})\\/[\\w./-]+\\.(?:${[...UZANTILAR]
    .sort((a, b) => b.length - a.length)
    .join('|')})(?![\\w])`,
  'g',
)
for (const ham of not.match(atifDeseni) ?? []) {
  const yol = ham.replace(/[.:]+$/, '')
  if (puan.has(yol)) {
    ekle(yol, 1000, 'notta adı geçiyor')
    ZORUNLU.add(yol)
  }
}

// -------------------------------------------- 2. katman: tanımlayıcılar
// Backtick içindeki ve CamelCase sözcükler koda ait adlardır: bileşen,
// fonksiyon, tablo, paket. Bunlar dilden bağımsız köprüdür — not Türkçe
// olsa da `normalizeDocument` her iki tarafta da aynı yazılır.

const tanimlayicilar = new Set()
for (const m of not.matchAll(/`([^`\n]{2,60})`/g)) tanimlayicilar.add(m[1].trim())
for (const m of not.matchAll(/\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*|[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*)\b/g))
  tanimlayicilar.add(m[1])

for (const ham of tanimlayicilar) {
  const t = ham.replace(/[`'"]/g, '').split(/[:(]/)[0].trim()
  if (t.length < 3) continue
  const cip = basename(t, extname(t))
  for (const f of dosyalar) {
    const ad = basename(f, extname(f))
    if (ad === cip) ekle(f, 300, `dosya adı: ${cip}`)
    else if (ad.toLowerCase().includes(cip.toLowerCase()) && cip.length >= 4)
      ekle(f, 120, `dosya adı içeriyor: ${cip}`)
    else if (cip.length >= 4 && icerik.get(f).includes(t)) {
      const g = ayirtEtme(sadelestir(t))
      if (g > 0) ekle(f, Math.round(120 * g), `kodda geçiyor: ${t}`)
    }
  }
}

const DURAK = new Set(
  ('ve veya ama ile için gibi daha çok az olan olarak bir bu şu o da de ki mi mı mu mü ise ne neden nasıl' +
    ' sonra önce üzerine göre kadar hem her hiç ise şey var yok değil olsun olur oluyor yapıyor yapılır' +
    ' the and for with that this from into then when what which have has not are was were will your you' +
    ' sahip cihazda bildirdi gövde başlık kapsam teknik direktif başarı kriteri dışı sıralama not issue' +
    ' yalnızca hangi kendi devam olabilir gerekiyor burada orada ister ikinci başka birlikte zaten' +
    ' ekran ekranda ekranı sayfa liste listesi bugün günün dönem büyük küçük yeni eski doğrudan')
    .split(/\s+/)
    .map(sadelestir),
)

// ------------------------------------------- 3. katman: sözlük köprüsü
// Bu projede notlar Türkçe, kod İngilizce. "para birimi tekerleği" hiçbir
// dosya adıyla eşleşmez — ama çeviri dosyası eşleşir: Türkçe metinden
// çeviri anahtarına, anahtardan onu kullanan bileşene gidilir. Köprü
// olmadan arayüz dilinde yazılmış her not kodla ilgisiz görünür.

if (SOZLUK) {
  let sozluk = {}
  try {
    sozluk = JSON.parse(readFileSync(SOZLUK, 'utf8'))
  } catch {
    console.error(`kaynak-sec: sözlük okunamadı, köprü atlandı: ${SOZLUK}`)
  }
  const cift = []
  const duzle = (o, on) => {
    for (const [k, v] of Object.entries(o)) {
      const anahtar = on ? `${on}.${k}` : k
      if (typeof v === 'string') cift.push([anahtar, v])
      else if (v && typeof v === 'object') duzle(v, anahtar)
    }
  }
  duzle(sozluk, '')

  // Köprünün yönü: nottaki Türkçe sözcük → o sözcüğü içeren çeviri
  // metinleri → onların anahtarları → anahtarı kullanan dosyalar.
  //
  // İki incelik var:
  //
  // 1. TÜRKÇE EK ALIR. Not "takvimde" yazar, çeviri "Takvim" der; düz
  //    içerme sınaması bunu kaçırır ve köprü tam da en güçlü olduğu yerde
  //    kopar. Sözcükleri gövdelerinden eşleştiriyoruz.
  // 2. AYIRT ETME NADİRLİKTİR. "takvim" 461 çevirinin 3'ünde geçer,
  //    "yalnızca" onlarcasında. Nadir sözcük güçlü sinyaldir.

  const GOVDE = 6
  const govdele = (w) => w.slice(0, GOVDE)
  const esGovde = (a, b) => a.startsWith(govdele(b)) || b.startsWith(govdele(a))

  const notSozcukleri = [
    ...new Set(sadelestir(not).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !DURAK.has(w))),
  ]

  // Çeviri metinlerini bir kez sözcüklerine ayır: her nota yeniden
  // bölmek 461 metni sözcük sayısı kadar kez tarar.
  const ceviriSozcukleri = cift.map(([anahtar, metin]) => [
    anahtar,
    new Set(sadelestir(metin).split(/[^a-z0-9]+/).filter((w) => w.length >= 5)),
  ])

  // Dosya başına: her sözcük en iyi eşleşmesiyle bir kez girer, sonra
  // azalan getiriye tabi tutulur. Dört vasat sinyal, bir güçlü sinyali
  // geçmemeli — #308'de tam olarak bu oluyordu.
  const kopru = new Map(dosyalar.map((f) => [f, []]))

  for (const w of notSozcukleri) {
    const vuran = ceviriSozcukleri.filter(([, kelimeler]) => [...kelimeler].some((k) => esGovde(k, w)))
    if (vuran.length === 0 || vuran.length > 10) continue
    const g = Math.log(cift.length / vuran.length) / Math.log(cift.length)

    const enIyi = new Map()
    for (const [anahtar] of vuran) {
      const sonParca = anahtar.split('.').pop()
      for (const f of dosyalar) {
        const m = icerik.get(f)
        let p = 0
        let neden = ''
        if (m.includes(anahtar)) {
          p = Math.round(500 * g)
          neden = `çeviri: ${w} → ${anahtar}`
        } else if (sonParca.length >= 6 && ayirtEtme(sadelestir(sonParca)) > 0 && m.includes(`'${sonParca}'`)) {
          // Anahtarın yalnız son parçasına bakmak ("title", "name") bütün
          // projeyi eşleştirir: o parça da ayırt edici değilse köprü kurulmaz.
          p = Math.round(150 * g)
          neden = `çeviri: ${w} → ${sonParca}`
        }
        if (p > (enIyi.get(f)?.[0] ?? 0)) enIyi.set(f, [p, neden])
      }
    }
    for (const [f, kayit] of enIyi) kopru.get(f).push(kayit)
  }

  // Azalan getiri: en güçlü sinyal tam, ikincisi yarım, üçüncüsü çeyrek.
  for (const [f, kayitlar] of kopru) {
    kayitlar.sort((a, b) => b[0] - a[0])
    kayitlar.forEach(([p, neden], i) => ekle(f, Math.round(p * 0.5 ** i), neden))
  }
}

// ------------------------------------------------- 4. katman: düz metin
// Geriye kalan anlamlı sözcükler. Zayıf sinyaldir, bilerek düşük puanlı:
// üstteki üç katman sustuğunda dökümün rastgele dolmasını engeller.

const sozcukler = new Map()
for (const w of sadelestir(not).split(/[^a-z0-9]+/)) {
  if (w.length < 5 || DURAK.has(w)) continue
  sozcukler.set(w, (sozcukler.get(w) ?? 0) + 1)
}

// Zayıf katmanın dosya başına tavanı var: dört zayıf eşleşme, bir güçlü
// eşleşmeyi geçmemeli. Tavan olmadan büyük dosya küçük dosyayı ezer.
const metinKayit = new Map(dosyalar.map((f) => [f, []]))

for (const [w, tekrar] of sozcukler) {
  const g = ayirtEtme(w)
  if (g === 0) continue
  const agirlik = Math.min(tekrar, 4) * g
  for (const f of dosyalar) {
    if (sadelestir(f).includes(w)) ekle(f, Math.round(60 * agirlik), `yolda: ${w}`)
    else if (sadeIcerik.get(f).includes(w)) metinKayit.get(f).push([Math.round(30 * agirlik), `metinde: ${w}`])
  }
}

for (const [f, kayitlar] of metinKayit) {
  kayitlar.sort((a, b) => b[0] - a[0])
  kayitlar.forEach(([p, neden], i) => ekle(f, Math.round(p * 0.5 ** i), neden))
}

// ------------------------------------------ 5. katman: ithalat genişletme
// Seçilen dosya tek başına yetmez: tiplerini ve yardımcılarını görmeyen
// model var olmayan alan adları uydurur. Bir sıçrama yeter — iki sıçrama
// dökümü yeniden bütün projeye çevirir.

const cozumle = (kaynak, hedef) => {
  if (!hedef.startsWith('.')) return null
  const taban = resolve(dirname(kaynak), hedef)
  for (const son of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const aday = relative(process.cwd(), taban + son)
    if (puan.has(aday)) return aday
  }
  return null
}

// Miras TOPLANMAZ, en güçlü ebeveynden alınır. Toplandığında herkesin
// kullandığı yardımcı dosya (errors.ts, LanguageContext.tsx) beş ayrı
// ebeveynden pay alıp asıl konunun önüne geçiyordu: çok kullanılmak
// ilgili olmak değildir.
const tohum = [...puan.entries()].filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1])
const miras = new Map()
for (const [f, p] of tohum.slice(0, 25)) {
  for (const m of icerik.get(f).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const hedef = cozumle(f, m[1])
    if (!hedef) continue
    const pay = Math.round(p * 0.3)
    if (pay > (miras.get(hedef)?.[0] ?? 0)) miras.set(hedef, [pay, basename(f)])
  }
}
for (const [hedef, [pay, kim]] of miras) {
  if (puan.get(hedef) < pay) ekle(hedef, pay - puan.get(hedef), `${kim} bunu kullanıyor`)
}

// ------------------------------------------------------- sıralama ve bütçe

const sirali = [...puan.entries()]
  .filter(([, p]) => p > 0)
  .sort((a, b) => b[1] - a[1] || boyut.get(a[0]) - boyut.get(b[0]))

const secilen = []
const alindi = new Set()
let harcanan = 0

for (const f of ZORUNLU) {
  if (alindi.has(f)) continue
  harcanan += boyut.get(f)
  alindi.add(f)
  secilen.push([f, puan.get(f)])
}
for (const f of HER_ZAMAN) {
  if (!puan.has(f) || alindi.has(f)) continue
  harcanan += boyut.get(f)
  alindi.add(f)
  secilen.push([f, puan.get(f)])
  sebep.get(f).unshift('her zaman gönderilir')
}
// Zorunlular bütçeyi tek başına aşabilir. Bu bir hata değil, bir haberdir:
// kesim yapılmıyor ama prompt beklenenden büyük çıkıyor, görünmesi gerekir.
if (harcanan > BUTCE) {
  console.error(`kaynak-sec: UYARI — zorunlu dosyalar bütçeyi aşıyor (${harcanan}/${BUTCE}). Kesilmediler.`)
}
if (HER_ZAMAN.length && harcanan === 0) {
  console.error(`kaynak-sec: UYARI — 'her zaman' listesindeki hiçbir dosya bulunamadı: ${HER_ZAMAN.join(' ')}`)
}
for (const [f, p] of sirali) {
  if (alindi.has(f)) continue
  const b = boyut.get(f)
  if (harcanan + b > BUTCE) continue
  harcanan += b
  secilen.push([f, p])
}

console.error(`kaynak-sec: ${dosyalar.length} dosyadan ${secilen.length} seçildi, ${harcanan}/${BUTCE} bayt`)
for (const [f, p] of secilen.slice(0, 30)) {
  console.error(`  ${String(p).padStart(5)}  ${f}  (${sebep.get(f).join('; ')})`)
}
// Hiçbir katman tutmadıysa döküm boş kalır ve model kodu hiç görmeden
// şartname yazar — bu, çok kod göndermekten daha kötüdür. Böyle bir durumda
// bütçeyi küçük dosyalardan doldururuz: seçim kötüdür ama kör değildir.
if (secilen.length === 0) {
  console.error('kaynak-sec: UYARI — hiçbir dosya notla ilişkilendirilemedi, bütçe boyuta göre dolduruluyor.')
  for (const f of [...dosyalar].sort((a, b) => boyut.get(a) - boyut.get(b))) {
    if (harcanan + boyut.get(f) > BUTCE) continue
    if (alindi.has(f)) continue
    harcanan += boyut.get(f)
    secilen.push([f, 0])
  }
}

for (const [f] of secilen) console.log(f)
