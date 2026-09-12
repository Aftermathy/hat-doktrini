#!/usr/bin/env node
// SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
//
// MCP okuma yolunun uyguladığı kaçışı, **okunabilirlik için** geri alır.
//
// ⚠️ Çıktısı geri yazılmaz. Sebebi matematiksel: MCP okuma yolu tersinir değil.
// Çıplak `&` `&amp;` olarak geliyor ama metinde **zaten duran** `&amp;`
// olduğu gibi geçiyor — iki ayrı kaynak aynı çıktıya düşüyor:
//
//   depoda `&`      → okumada `&amp;`
//   depoda `&amp;`  → okumada `&amp;`
//
// Yani okunan metinden gövdeyi geri kurmak mümkün değil; bu script de onu
// yapmıyor, yalnızca "büyük ihtimalle bu yazıyordu" diye okunabilir hâle
// getiriyor. Ölçüldü (#500, 26 Ağustos): çıktısı geri yazıldığında kaçışı
// **anlatan** bir tablonun sağ sütunu eridi ve iki sütun aynı hâle geldi.
//
// **Gövdeyi yeniden yazacak olan doğrudan API'den okur** — depo public, kimlik
// doğrulaması gerekmiyor ve dönen metin ham:
//
//   curl -s https://api.github.com/repos/<owner>/<repo>/pulls/<N> \
//     | python3 -c 'import json,sys; sys.stdout.write(json.load(sys.stdin)["body"])'
//
// Kullanım (yalnızca okumak için):
//   node .github/scripts/govde-coz.mjs < mcp-okumasi.md
//
// Çözülen varlık sayısı stderr'e yazılır.

/**
 * Kaçışın **tam tersi**. Tek geçişli soldan sağa tarama, çünkü ardışık
 * `replace` çağrıları iç içe geçmiş varlığı iki kez çözer: özgün metinde duran
 * `&lt;` kaçışta `&amp;lt;` olur ve `&amp;` önce çözülürse ortaya çıkan `&lt;`
 * ikinci turda `<`'e döner — özgün metin geri gelmez. Tarama, ürettiği metnin
 * üstünden bir daha geçmediği için bu sınıf hatayı yapısal olarak dışarıda
 * bırakıyor.
 */
export function govdeCoz(metin) {
  const varliklar = [
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&#34;', '"'],
    ['&#39;', "'"],
  ]
  let cikti = ''
  let i = 0
  let sayi = 0
  while (i < metin.length) {
    if (metin[i] === '&') {
      const eslesme = varliklar.find(([varlik]) => metin.startsWith(varlik, i))
      if (eslesme) {
        cikti += eslesme[1]
        i += eslesme[0].length
        sayi++
        continue
      }
    }
    cikti += metin[i]
    i++
  }
  return { metin: cikti, sayi }
}

/**
 * Go'nun `html.EscapeString`'i. **MCP okuma yolunun modeli değil** — ölçüldü ve
 * tutmadı: okuma yolu zaten varlık olan metne dokunmuyor, `EscapeString`
 * dokunuyor. Burada yalnızca testin karşı yakası olarak duruyor.
 */
export function govdeKac(metin) {
  return metin
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&#34;')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const parcalar = []
  for await (const parca of process.stdin) parcalar.push(parca)
  const girdi = Buffer.concat(parcalar).toString('utf8')

  const { metin, sayi } = govdeCoz(girdi)
  process.stdout.write(metin)
  process.stderr.write(`govde-coz: ${sayi} HTML varlığı çözüldü (geri yazma!)\n`)
}
