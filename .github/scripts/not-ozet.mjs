#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// Mühendislik notlarını **özetleyerek** prompt'a basar.
//
// Neden var: hem PM hem iç kontrol, `docs/notes/` altındaki en yeni 20-25 notu
// **tam metin** basıyordu ve bu blok hiçbir bütçeye tabi değildi. Notlar
// biriktikçe her çağrı sessizce pahalılaşıyordu — 25 Ağustos'ta en yeni 25 not
// 110 KB'ydi, yani tek başına PM prompt'unun beşte biri.
//
// Notun işlevi bir kararın **var olduğunu** ve ne dediğini bildirmek; gerekçenin
// tamamını okumak denetçinin işi değil. Bu yüzden her nottan başlık ve ilk
// paragraf alınıyor, gerisi düşüyor. Dosya adı da yazılıyor: tamamını okumak
// isteyen depoda bulur.
//
// Kullanım: not-ozet.mjs --dizin docs/notes --adet 20 --butce 20000

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf(`--${ad}`)
  return i === -1 ? varsayilan : process.argv[i + 1]
}

const dizin = arg('dizin', 'docs/notes')
const adet = Number(arg('adet', '20'))
const butce = Number(arg('butce', '20000'))
/** Not başına tavan: bir notun tek başına bütçeyi yutması engelleniyor. */
const NOT_TAVANI = Number(arg('not-tavani', '900'))

let dosyalar = []
try {
  dosyalar = readdirSync(dizin).filter((f) => f.endsWith('.md')).sort()
} catch {
  process.exit(0)
}

// En yeniden geriye: bütçe dolduğunda kesilen **eski** not olsun.
const secilen = dosyalar.slice(-adet).reverse()

let toplam = 0
const parcalar = []
let kirpilan = 0

for (const ad of secilen) {
  let metin
  try {
    metin = readFileSync(join(dizin, ad), 'utf8')
  } catch {
    continue
  }
  const satirlar = metin.split('\n')
  const baslik = (satirlar.find((s) => s.startsWith('# ')) ?? `# ${ad}`).replace(/^#\s*/, '')

  // İlk paragraf: başlıktan sonraki ilk dolu blok. Notun bulgusu orada durur.
  const govde = satirlar
    .slice(satirlar.findIndex((s) => s.startsWith('# ')) + 1)
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#'))

  /*
    İlk paragraf çoğu notta künye oluyor ("25 Ağustos 2026 · #457"), yani
    bulguyu değil tarihi taşıyor. Bulgu, ilk **dolu** paragraftır: künyeler
    kısadır ve neredeyse tamamen tarih/atıf işaretinden oluşur.
  */
  const dolu = govde.find((p) => p.replace(/\s+/g, ' ').length > 90) ?? govde[0] ?? ''
  let ozet = dolu.replace(/\s+/g, ' ')
  if (ozet.length > NOT_TAVANI) ozet = `${ozet.slice(0, NOT_TAVANI)}…`

  const parca = `- **${baslik}** (\`${ad}\`)\n  ${ozet}\n`
  if (toplam + parca.length > butce) {
    kirpilan += 1
    continue
  }
  toplam += parca.length
  parcalar.push(parca)
}

process.stdout.write(parcalar.join('\n'))
if (kirpilan > 0) {
  process.stdout.write(
    `\n_(${kirpilan} eski not bütçeye sığmadı; tamamı \`${dizin}/\` altında.)_\n`,
  )
}
console.error(`not-ozet: ${parcalar.length} not, ${toplam} bayt, ${kirpilan} atlandı`)
