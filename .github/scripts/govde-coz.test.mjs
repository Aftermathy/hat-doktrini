/**
 * `govde-coz.mjs`'nin regresyon sınaması.
 *
 * Koşma: `node --test .github/scripts/`
 *
 * 29 Eylül 2026'da Vault'tan taşındı (`scripts/govde-coz.test.ts`). Sebebi:
 * betik `@v2` ile merkeze taşındı ve Vault'taki kopyası silindi; testin orada
 * kalması, bu depoda koşmayan bir kodu sınamak olurdu. Taşınırken `vitest`
 * yerine `node:test`e çevrildi — merkezde vitest yok ve olması da gerekmiyor.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { govdeCoz, govdeKac } from './govde-coz.mjs'

const coz = (s) => govdeCoz(s).metin

/**
 * Kapı tek bir şeyi ölçüyor: çözme, kaçışın **tersi** mi. Örnekler #487'de
 * ölçülen gerçek gövde parçalarından alındı — uydurulmuş girdi, uydurulmuş
 * güven verir.
 */
describe('govde-coz', () => {
  it('okuma yolundan gelen gövdeyi ham metne çevirir', () => {
    assert.equal(coz('tsc -b &amp;&amp; vite build'), 'tsc -b && vite build')
    assert.equal(coz('zizmor CI&#39;da raporlayıcı adım'), "zizmor CI'da raporlayıcı adım")
    assert.equal(
      coz('&#34;Kapı önce raporlasın, sonra kessin&#34;'),
      '"Kapı önce raporlasın, sonra kessin"',
    )
    assert.equal(coz('current_period_end &lt; now()'), 'current_period_end < now()')
    assert.equal(coz('&gt; alıntı satırı'), '> alıntı satırı')
  })

  it('kaçışın dokunmadığı karakterleri de değiştirmez', () => {
    const dokunulmayan = '⚠️ Migration: 0045_x.sql — birleştikten sonra çalıştırılmalı → Supabase'
    assert.equal(coz(dokunulmayan), dokunulmayan)
  })

  it('damga ve harita satırlarını bozulmadan geçirir', () => {
    const damga =
      '`bakım: ' +
      '0'.repeat(40) +
      ' · ci:success · yorum:yok · durum:basladi · koşu:abc · yanıtsız:0`'
    assert.equal(coz(govdeKac(damga)), damga)

    const harita = '`harita: sabit-karar | Damga görünür satırda durur | HTML yorumu hayatta kalmıyor`'
    assert.equal(coz(govdeKac(harita)), harita)
  })

  /**
   * Asıl kapı bu: iç içe geçmiş varlık. Özgün metinde duran `&lt;` kaçıştan
   * `&amp;lt;` olarak çıkar; ardışık `replace` ile çözen bir uygulama onu `<`
   * yapar ve özgün metin geri gelmez. Tek geçişli tarama bunu kesiyor.
   */
  it('özgün metinde duran HTML varlığını ikinci kez çözmez', () => {
    for (const ozgun of [
      '&lt;',
      '&amp;',
      '&amp;lt;',
      'a &#39; b &amp;&amp; c',
      '&&&',
      '& lt;',
      '',
    ]) {
      assert.equal(coz(govdeKac(ozgun)), ozgun)
    }
  })

  it('kaç varlık çözdüğünü sayar', () => {
    assert.equal(govdeCoz('a &amp; b &lt; c').sayi, 2)
    assert.equal(govdeCoz('hiç varlık yok').sayi, 0)
  })
})

/**
 * Asıl kapı, ve ölçülerek öğrenildi: **MCP okuma yolu tersinir değil.**
 *
 * Çıplak `&` `&amp;` olarak geliyor ama metinde zaten duran `&amp;` olduğu gibi
 * geçiyor — iki ayrı kaynak aynı çıktıya düşüyor. Bu yüzden okunan metinden
 * gövde geri kurulamaz, ve bu script'in çıktısı **geri yazılmaz**.
 *
 * İlk teşhis "çift çözme" demişti ve yanlıştı: 26 Ağustos 00:25'te gövdeyi
 * bozan tur çözmeyi **bir kez** ve doğru uygulamıştı. Kayıp çözmede değil,
 * okumada olmuştu.
 */
describe('MCP okumasının tersinirliği', () => {
  /** Ölçülen davranış: çıplak karakter kaçırılıyor, var olan varlığa dokunulmuyor. */
  const mcpOkumasi = (depoda) =>
    depoda.replace(/&(?!(?:amp|lt|gt|#34|#39);)/g, '&amp;').replaceAll('<', '&lt;')

  it('iki ayrı gövde aynı okumaya düşüyor', () => {
    assert.equal(mcpOkumasi('| `&` |'), mcpOkumasi('| `&amp;` |'))
  })

  it('bu yüzden çözme gövdeyi geri getiremiyor', () => {
    const depoda = '| `&` | `&amp;` |'
    const geriKurulan = coz(mcpOkumasi(depoda))
    assert.notEqual(geriKurulan, depoda)
    // Ödenen bedel tam olarak buydu: iki sütun aynı hâle geldi.
    assert.equal(geriKurulan, '| `&` | `&` |')
  })

  /**
   * Kaçış modeli de tutmuyor: `html.EscapeString` var olan varlığı da kaçırır,
   * MCP okuma yolu kaçırmaz. Bu yüzden "yazılan `X` ise okunan `escape(X)`"
   * diye kurulan bir geri okuma kapısı doğru yazmaları da reddederdi.
   */
  it('escape(depo) MCP okumasına eşit değil', () => {
    const depoda = '| `&` | `&amp;` |'
    assert.notEqual(govdeKac(depoda), mcpOkumasi(depoda))
  })

  /** Çözme yine de kayıpsız olanı kayıpsız çeviriyor — script'in dar işi bu. */
  it('varlık taşımayan metinde gidiş-dönüş birebir', () => {
    for (const x of ['düz metin', 'tsc -b && vite build', "CI'da", '']) {
      assert.equal(coz(mcpOkumasi(x)), x)
    }
  })
})
