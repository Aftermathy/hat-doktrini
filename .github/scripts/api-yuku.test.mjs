/**
 * `api-yuku.mjs`'nin iki saf fonksiyonunun regresyon sınaması.
 *
 * Koşma: `node .github/scripts/api-yuku.test.mjs`
 *
 * Buradaki her durum, denetimin **gerçekten yakaladığı** bir yanlış sayımdan
 * geliyor. İkisi de sessiz arızaydı: betik hata vermiyor, yalnızca yanlış sayı
 * üretiyordu — yani ölçüm aracının kendisi ölçülmeden yanlıştı.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kabukSatirlari, ghCagrilari, cronGunluk } from './api-yuku.mjs'

let dusen = 0
const esit = (bulunan, beklenen, ad) => {
  const ok = bulunan === beklenen
  if (!ok) dusen++
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : `  (beklenen ${beklenen}, bulunan ${bulunan})`}`)
}

// ── Derinlik: tek satırlık döngü ────────────────────────────────────────────
//
// `for …; do gh …; done` hem açıyor hem kapatıyor. Komut o döngünün İÇİNDE,
// ama sonraki satırlar DIŞINDA. Eski kod kapanışı düşürüp açılışı sonra
// eklediği için ikisini de yanlış yapıyordu ve sayaç bir daha sıfıra
// dönmüyordu — tek bir tek-satırlık döngü kendinden sonraki her satırı bozdu.
const dizin = mkdtempSync(join(tmpdir(), 'api-yuku-'))
const yol = join(dizin, 'sinama.yml')
writeFileSync(yol, `name: sinama
jobs:
  x:
    steps:
      - name: adim
        run: |
          gh api /a
          for i in 1 2 3; do gh api /b; done
          gh api /c
          for i in 1 2; do
            gh api /d
          done
          gh api /e
`)

const beklenen = { '/a': 0, '/b': 1, '/c': 0, '/d': 1, '/e': 0 }
console.log('derinlik')
for (const r of kabukSatirlari(readFileSync(yol, 'utf8'))) {
  const m = r.satir.match(/gh api (\/\w+)/)
  if (m) esit(r.derinlik, beklenen[m[1]], `${m[1]} derinliği`)
}

// ── Ayraçlar tırnak dışında ayraçtır ────────────────────────────────────────
//
// `--jq '.msg | length'` içindeki boru bir jq operatörü. Ayraç sayılırsa çağrı
// ikiye bölünür ve ikinci parça `gh` ile başlamadığı için düşer: sayım
// şişmiyor, **eksiliyor** — yani yük olduğundan az görünüyor.
console.log('tırnak maskeleme')
for (const [satir, bek] of [
  [`gh api /x --jq '.msg | length'`, 1],
  [`gh api /x --jq '.a; .b'`, 1],
  [`gh api /x --jq ".a && .b"`, 1],
  [`gh api /x && gh api /y`, 2],
  [`echo $(gh api /x) | gh api /y`, 2],
  [`gh api /x | jq '.[] | .id'`, 1],
]) {
  esit(ghCagrilari(satir).length, bek, satir)
}

// ── Kabuk anahtar sözcüğü çağrıyı gizlemez ─────────────────────────────────
//
// Derinlik düzeltmesi tek satırlık döngüyü doğru derinlikte sayıyordu ama
// çağrının kendisi hiç bulunamıyordu: `;` ile bölünen parça `do gh api /b`
// oluyor, `^gh` tutmuyor ve çağrı sessizce düşüyordu. Yani derinliği doğru,
// varlığı yanlıştı — yük yine olduğundan az görünüyordu.
console.log('anahtar sözcük öneki')
for (const [satir, bek] of [
  [`for i in 1 2 3; do gh api /b; done`, 1],
  [`while read x; do gh pr view "$x" --json number; done`, 1],
  [`if gh api /a; then gh api /b; fi`, 2],
  [`do ! gh api /a`, 1],
  [`echo do gh api /a`, 0],   // komut değil, metin
]) {
  esit(ghCagrilari(satir).length, bek, satir)
}

// ── Cron: çözülemeyen `null` döner, sıfır değil ────────────────────────────
//
// Eskiden `@daily` ve `MON-FRI` gibi yaygın ifadeler 0 dönüyordu ve toplama
// sessizce 0 katıyordu: günde bir koşan bir iş akışı "hiç koşmuyor" gibi
// görünüyordu. Ölçümün yanlış tarafa kayması bu — yükü olduğundan az
// göstermek, kota planlamasını doğrudan yanıltır.
console.log('cron')
for (const [ifade, bek] of [
  ['*/15 * * * *', 96],
  ['*/30 * * * *', 48],
  ['20 3 * * *', 1],
  ['20 * * * *', 24],
  ['@daily', 1],
  ['@hourly', 24],
  ['0,30 * * * *', 48],
  ['0 9-17 * * *', 9],
  ['0 */6 * * *', 4],
  ['0 2 * * MON-FRI', 1],
]) {
  esit(cronGunluk(ifade), bek, ifade)
}
esit(cronGunluk('garip ifade burada'), null, 'çözülemeyen → null (0 değil)')

console.log(dusen ? `\n${dusen} sınama düştü` : '\nhepsi geçti')
process.exit(dusen ? 1 : 0)
