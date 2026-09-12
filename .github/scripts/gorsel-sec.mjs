#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// Issue metninden görsel adreslerini ayıklar.
//
//   node .github/scripts/gorsel-sec.mjs <metin-dosyası> [--tavan 4]
//
// stdout: her satırda bir adres, metinde göründükleri sırayla.
// stderr: kaç adres bulundu, kaçı elendi.
//
// NEDEN VAR: mimar denetçisi bugüne kadar yalnızca metin görüyor. Sahip
// ekran görüntüsü paylaşsa bile istem yalnızca markdown'ın kendisini
// taşıyordu, yani model "![ekran](https://…)" dizesini okuyup görüntüyü hiç
// görmüyordu. Kör bir denetçiden estetik yargı beklemek, sonucu da körlüğün
// kendisi kadar boş yapıyordu.

import { readFileSync } from 'node:fs'

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf(`--${ad}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : varsayilan
}

const DOSYA = process.argv[2]
/**
 * Kaç görsel gönderilir. Tavan maliyet için: her görsel istemi büyütüyor ve
 * bir issue'ya onlarca ekran görüntüsü düşebiliyor. İlk birkaçı konuyu
 * anlatır; gerisi aynı ekranın başka açısıdır.
 */
const TAVAN = Number(arg('tavan', 4))

if (!DOSYA) {
  console.error('gorsel-sec: metin dosyası gerekli')
  process.exit(2)
}

let metin = ''
try {
  metin = readFileSync(DOSYA, 'utf8')
} catch {
  console.error(`gorsel-sec: okunamadı: ${DOSYA}`)
  process.exit(1)
}

/**
 * GitHub'ın kendi ek deposu uzantı taşımıyor: adres bir UUID ile bitiyor ve
 * türü ancak indirilince belli oluyor. Uzantıya bakan bir süzgeç bu adresleri
 * elerdi — oysa sahibin sürükleyip bıraktığı her ekran görüntüsü tam olarak
 * bu biçimde geliyor.
 */
const EK_DEPOSU = /^https:\/\/github\.com\/user-attachments\/assets\/[\w-]+$/
const UZANTILI = /\.(png|jpe?g|gif|webp)(\?[^\s)]*)?$/i

const gorselMi = (u) => EK_DEPOSU.test(u) || UZANTILI.test(u)

const bulunan = []
const ekle = (ham) => {
  if (!ham) return
  const u = ham.trim().replace(/[)>,.]+$/, '')
  if (!u.startsWith('https://')) return
  if (!gorselMi(u)) return
  if (bulunan.includes(u)) return
  bulunan.push(u)
}

// Markdown: ![alt](adres "başlık")
for (const m of metin.matchAll(/!\[[^\]]*\]\(\s*([^\s)]+)/g)) ekle(m[1])
// HTML: <img src="adres">
for (const m of metin.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) ekle(m[1])
// Çıplak ek adresi: sahip görseli sürükleyince GitHub bazen markdown
// sarmalamadan düz bağlantı bırakıyor.
for (const m of metin.matchAll(/https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/g)) ekle(m[0])

const secilen = bulunan.slice(0, TAVAN)
const elenen = bulunan.length - secilen.length

console.error(
  `gorsel-sec: ${bulunan.length} görsel bulundu, ${secilen.length} gönderilecek` +
    (elenen > 0 ? `, ${elenen} tavana takıldı` : ''),
)
for (const u of secilen) console.log(u)
