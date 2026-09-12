#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// Zamanlanmış koşuların gerçekte hangi sıklıkta koştuğunu ölçer.
//
// Neden var: bu ölçüm iki kez elle yapıldı ve ikisinde de aynı sınıf hata
// yapıldı — **ölü koşular canlı sayıldı.** İlkinde `skipped` düşülmüş ama
// `cancelled` düşülmemişti ve sayım 19 derken gerçek 4'tü. İkincisinde (#525'in
// ham notu) 26 Ağustos "19 koşu" diye taban alındı; o günün 55 koşusunun 46'sı
// harcama sınırı duvarına çarpıp **üç saniyede**, tek adım koşmadan düşmüştü.
// Yani taban günün kendisi bir enkaz yığınıydı ve ona kıyaslanan düşüş sekiz
// kat görünüyordu; sağlam bir güne kıyaslandığında dört buçuk kat.
//
// Aradaki fark akademik değil: sekiz kat "hat durdu" der ve tetikleyici
// yüzeyini değiştirmeye götürür — doktrinin en pahalı hatası olarak yazdığı
// karar. Dört buçuk kat, üstelik yükselen bir eğriyle, "bekle ve yeniden ölç"
// der.
//
// Ölçüt bu yüzden koşunun **varlığı** değil, iş yapmış olması. Üç imza ölü
// sayılıyor:
//
//   1. `skipped` — koşu hiç başlamadı.
//   2. `cancelled` — yarıda kesildi; taşıdığı iş işlenmemiş olabilir.
//   3. Saniyeler içinde, tek adım koşmadan düşen job (`--olu-esik`).
//      `AGENT-WORKFLOW.md` bu imzayı adıyla anlatıyor: runner atanmıyor,
//      dakika bitmiş ya da servis kesik. Kod hatası gibi görünmez, log da
//      üretmez.
//
// Üçüncüsü `failure` ile karışmasın diye ayrı: gerçekten koşup kırmızı biten
// bir job **iş yapmıştır** — hüküm vermiştir. Süresi eşiğin altında olan
// hiçbir şey yapmamıştır.
//
// **Ama "ölü" tek bir hane değil, ve ikisini toplamak arızayı görünmez
// yapıyordu.** Ölü kümesinin içinde iki ayrı dünya var:
//
//   - `skipped` / `cancelled`: koşu doğdu, iş **yoktu** ya da bırakıldı. Bu
//     hattın normal gürültüsü; her turda onlarcası olur.
//   - Saniyeler içinde `failure`: koşu doğdu, iş **vardı**, GitHub başlatmayı
//     reddetti. Ödeme duvarı, dakika kotası, servis kesintisi. Tetikleyici
//     çalışıyor; çalışmayan platform.
//
// İkisi aynı hanede toplandığında ölçüm yanlış soruyu yanıtlıyor. 30 Ağustos
// 2026'da bu ölçüldü (#525): hat 07:31'den itibaren ödeme duvarının arkasına
// düştü, tetiklenen her koşu üç saniyede tek adım koşmadan öldü ve tablo
// "bakıcı 01:30'dan beri hiç koşmadı" dedi. Doğrusu: **koştu, başlatılmadı.**
// Aradaki fark bu aracın var olma sebebiyle aynı — biri "tetikleyici seyreldi"
// der ve tetikleyici yüzeyini değiştirmeye götürür, öbürü "faturaya bak" der.
//
// Duvar bu yüzden kendi sütununda duruyor. Ayrımın ölçütü ideal olarak
// job'ın **adım sayısı** olurdu (duvara çarpan job sıfır adımla düşer), ama o
// sayı koşu listesinde yok: her koşu için ayrı bir `/jobs` çağrısı gerekirdi
// ve ölçüm yüz koşuda yüz çağrıya çıkardı. Süre eşiği aynı ayrımı bedava
// yapıyor — gerçekten koşup kırmızı biten bir job eşiğin altında bitmez.
//
// Canlı kümenin tanımı bu yüzden **hiç değişmedi**: duvar zaten ölü sayılıyordu,
// yalnızca ölünün içinden ayrıldı. Önceki turların canlı sayıları ve boşluk
// dizileri bu sürümle birebir aynı çıkar; yoksa kıyas serisi kopardı.
//
// Depo public olduğu için kimlik doğrulaması gerekmiyor; `GITHUB_TOKEN`
// ortamda varsa kota için kullanılıyor.
//
// Kullanım:
//   kosu-sikligi.mjs --depo Aftermathy/vault --gun 7
//   kosu-sikligi.mjs --depo Aftermathy/vault --olay schedule --sayfa 3

/*
  Node'un yerleşik `fetch`i `HTTPS_PROXY`'yi kendiliğinden okumaz; okuması
  `NODE_USE_ENV_PROXY` ile açılır (Node ≥ 22.21) ve o değişken **süreç
  başlamadan** konmuş olmalı — betiğin içinden atamak geç kalır. Bu yüzden
  vekil tanımlıyken betik kendini bir kez yeniden çağırıyor.

  Bedeli ölçüldü: vekilin arkasındaki bir oturumda betik bu satırlar olmadan
  hiç koşamıyordu ve arıza iki ayrı kılıkta çıkıyordu. `GITHUB_TOKEN` ortamda
  yer tutucu bir dizeyse (bulut oturumunda öyle) istek doğrudan GitHub'a gidip
  `401 Bad credentials` alıyor; değişken hiç yoksa istek oturumun paylaşılan
  çıkış IP'sinden kimliksiz gidiyor ve saatlik 60'lık kimliksiz kovaya
  düşüyor — `403`, üstelik kova çoktan tükenmiş oluyor. Vekilden geçen aynı
  istekte tavan 15.000 ve kimlik bilgisini vekil kendisi yerleştiriyor, yani
  yer tutucu değişken de zararsız hâle geliyor.

  Ölçüm aracının, ölçümü yapması gereken ortamda koşamaması sessiz bir arıza
  sınıfıydı: #525'in üç turu sayımı elle yaptı ve her defasında betiğin
  ayıklamaları (ölü/duvar ayrımı) devre dışı kaldı.

  Vekil yoksa hiçbir şey değişmiyor — Actions koşusu bu daldan hiç geçmez.
  Node 22.21'den eskiyse değişken yok sayılır; nöbetçi tekrar çağrıyı
  engellediği için betik döngüye girmez, yalnızca eski davranışına döner.
*/
const vekil = process.env.HTTPS_PROXY ?? process.env.https_proxy
if (vekil && !process.env.NODE_USE_ENV_PROXY) {
  const { spawnSync } = await import('node:child_process')
  const sonuc = spawnSync(process.execPath, [process.argv[1], ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  })
  process.exit(sonuc.status ?? 1)
}

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf(`--${ad}`)
  return i === -1 ? varsayilan : process.argv[i + 1]
}

const depo = arg('depo', process.env.GITHUB_REPOSITORY)
const olay = arg('olay', 'schedule')
const sayfa = Number(arg('sayfa', '2'))
const gun = Number(arg('gun', '7'))
/** Bu sürenin altında biten koşu iş yapmamış sayılır (saniye). */
const OLU_ESIK = Number(arg('olu-esik', '10'))

if (!depo) {
  console.error('depo verilmedi: --depo sahip/ad ya da GITHUB_REPOSITORY')
  process.exit(1)
}

const baslik = { Accept: 'application/vnd.github+json' }
if (process.env.GITHUB_TOKEN) baslik.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const kosular = []
for (let s = 1; s <= sayfa; s++) {
  const url = `https://api.github.com/repos/${depo}/actions/runs?per_page=100&event=${olay}&page=${s}`
  const yanit = await fetch(url, { headers: baslik })
  if (!yanit.ok) {
    /*
      Yarım veriyle rapor yazmak, ölçümü hiç yapmamaktan kötü: eksik sayfa
      "o gün az koştu" diye okunur ve tam da aranan şey o sayıdır.

      Durum kodu tek başına yanlış teşhise götürüyor: kimliksiz kovanın
      tükenmesi de, kuruluş politikasının hostu kapatması da `403`. İkisi ayrı
      arıza ve ayrı yerde aranıyor. GitHub sebebi gövdesinde yazıyor; yazdığı
      yerden okunmazsa okuyan tahmin eder.
    */
    const sebep = await yanit
      .json()
      .then((g) => g?.message ?? '')
      .catch(() => '')
    console.error(
      `API düştü (sayfa ${s}): ${yanit.status} ${yanit.statusText}${sebep ? ` — ${sebep}` : ''}`,
    )
    process.exit(1)
  }
  const gelen = (await yanit.json()).workflow_runs ?? []
  kosular.push(...gelen)
  if (gelen.length < 100) break
}

const saniye = (k) =>
  (new Date(k.updated_at) - new Date(k.run_started_at ?? k.created_at)) / 1000

const atlandiMi = (k) => k.conclusion === 'skipped' || k.conclusion === 'cancelled'

const oluMu = (k) => atlandiMi(k) || (k.conclusion !== null && saniye(k) < OLU_ESIK)

/**
 * Tetiklendi ama başlatılmadı: iş vardı, platform reddetti.
 * Eşiğin altında biten bir `success` duvar değil — reddedilen job kırmızı düşer.
 */
const duvarMi = (k) =>
  !atlandiMi(k) && k.conclusion === 'failure' && saniye(k) < OLU_ESIK

const sinir = new Date(Date.now() - gun * 86400_000)
const secilen = kosular.filter((k) => new Date(k.created_at) >= sinir)

if (secilen.length === 0) {
  console.log(`son ${gun} günde ${olay} koşusu yok`)
  process.exit(0)
}

/** gün → iş akışı → { ham, olu, duvar } */
const tablo = new Map()
for (const k of secilen) {
  const g = k.created_at.slice(0, 10)
  if (!tablo.has(g)) tablo.set(g, new Map())
  const satir = tablo.get(g)
  const kayit = satir.get(k.name) ?? { ham: 0, olu: 0, duvar: 0 }
  kayit.ham += 1
  if (oluMu(k)) kayit.olu += 1
  if (duvarMi(k)) kayit.duvar += 1
  satir.set(k.name, kayit)
}

const adlar = [...new Set(secilen.map((k) => k.name))].sort()

console.log(`${depo} · olay=${olay} · son ${gun} gün · ölü eşiği ${OLU_ESIK}sn`)
console.log('(canlı / duvar / ham — ham sayı ölü koşuların hepsini içerir)')
console.log('duvar = tetiklendi, başlatılmadı (ödeme sınırı, kota, servis)\n')

/** Sütun genişliği: en uzun ad artı iki boşluk — bitişik sütunlar okunmuyor. */
const en = Math.max(12, ...adlar.map((a) => a.length)) + 2
console.log('gün'.padEnd(12) + adlar.map((a) => a.padStart(en)).join(''))
for (const g of [...tablo.keys()].sort()) {
  const satir = tablo.get(g)
  const hucreler = adlar.map((a) => {
    const k = satir.get(a)
    if (!k) return '—'.padStart(en)
    return `${k.ham - k.olu}/${k.duvar}/${k.ham}`.padStart(en)
  })
  console.log(g.padEnd(12) + hucreler.join(''))
}

/*
  Duvar penceresi ayrı yazılıyor, çünkü boşluk dizisi onu okuyamıyor: duvara
  çarpan koşu canlı değil, yani iki canlı koşu arasındaki boşluğun **içinde**
  kalıyor ve orada "tetikleyici sustu" gibi görünüyor. Pencereyi görmeden
  okunan uzun bir boşluk, yanlış arızayı işaret eder.
*/
const duvarlar = secilen.filter(duvarMi)
if (duvarlar.length > 0) {
  const sirali = [...duvarlar].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const ilk = sirali[0].created_at
  const son = sirali[sirali.length - 1].created_at
  console.log(`\nDuvar: ${duvarlar.length} koşu tetiklendi, başlatılmadı — ${ilk} → ${son}`)
  console.log('  Bu pencereye düşen boşluklar tetikleyiciyi değil duvarı ölçer.')
  for (const ad of adlar) {
    const n = duvarlar.filter((k) => k.name === ad).length
    if (n > 0) console.log(`  ${ad}: ${n}`)
  }
}

/*
  Boşluk, sayımın söylemediğini söylüyor: günde 4 koşu düzgün dağılmışsa altı
  saatte bir, kümelenmişse art arda dört koşu ve yirmi saat sessizlik demek.
  Takılan işi arayan bir süpürücü için ikisi aynı şey değil.
*/
console.log('\nCanlı koşular arası boşluk (dakika):')
for (const ad of adlar) {
  const zaman = secilen
    .filter((k) => k.name === ad && !oluMu(k))
    .map((k) => new Date(k.created_at))
    .sort((a, b) => a - b)
  if (zaman.length < 2) {
    console.log(`  ${ad}: ${zaman.length} canlı koşu — boşluk hesaplanamıyor`)
    continue
  }
  const bosluk = zaman.slice(1).map((t, i) => Math.round((t - zaman[i]) / 60000))
  const sirali = [...bosluk].sort((a, b) => a - b)
  const ortanca = sirali[Math.floor(sirali.length / 2)]
  console.log(
    `  ${ad}: en az ${sirali[0]} · ortanca ${ortanca} · en fazla ${sirali[sirali.length - 1]}`,
  )
}
