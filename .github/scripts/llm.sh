#!/usr/bin/env bash
# SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
#
# Tek bir metin üretme kapısı: prompt.md okur, out.md yazar.
#   llm.sh <prompt-dosyası> <çıktı-dosyası> [maks-token]
#
# Neden tek kapı: hattın her adımı ayrı ayrı sağlayıcıya bağlanırsa, o
# sağlayıcının kotası dolduğu anda akışın tamamı durur ve insan elle itmek
# zorunda kalır. Burada birinci sağlayıcı düşerse ikincisi devralır; akış
# durmaz, yalnızca hangi modelin yazdığı değişir.
#
# Sıra: GEMINI_API_KEY (ücretsiz katman, kota dolabilir) → ANTHROPIC_API_KEY.
# İkisi de yoksa çıkış kodu 1 ve boş çıktı.
#
# Çıkış kodları — 2 ile 1'in ayrılması bir teşhis aracıdır:
#   0  çıktı üretildi
#   1  çağrı düştü (ağ, kota, anahtar yok, boş yanıt) — iş ertelenir
#   2  çağrı **başarılı** oldu ve çıktı tavanında kesildi (max_tokens)
#
# İkisi tek koda düşerken çağıranın yazabildiği tek cümle "sağlayıcı yanıt
# vermedi" idi ve bu, tavanda kesilen çağrı için yanlıştı: sağlayıcı yanıt
# verdi, tavan kadar çıktı token'ı faturalandı, yalnızca metin yarım kaldı.
# İki arızanın çözümü de zıt — biri beklemek, öteki girdiyi küçültmek — ve
# ayırt edilemeyen arıza düzeltilemez.

set -uo pipefail

# Harcamayı kimse görmüyordu: fatura 24 saat gecikmeli geliyor ve o da
# sağlayıcı sitesinde. Her çağrı kendi token'ını buraya yazar; günlük
# toplayıcı bunları docs/MALIYET.md'ye çevirir.
# Tek kopya: arayüzü değiştiren commit iki dosyaya birden dokunmak zorunda
# kalmasın diye fonksiyon artık maliyet-yaz.sh'ten geliyor.
. "$(dirname "$0")/maliyet-yaz.sh"

PROMPT="${1:?prompt dosyası gerekli}"
OUT="${2:?çıktı dosyası gerekli}"
MAKS="${3:-8000}"

: >"$OUT"

gemini_dene() {
  [ -n "${GEMINI_API_KEY:-}" ] || return 1
  local model="${GEMINI_MODEL:-${MODEL:-gemini-3.6-flash}}" http
  # Çıktı tavanı verilmezse model kendi varsayılanında kesiliyor ve uzun
  # çıktı isteyen işler (şartnamenin tam gövdesi) yarım dönüyordu. Yarım
  # dönen çıktı burada "düştü" sayılıp yedeğe geçiliyordu: fatura Claude'a,
  # sebep görünmez.
  jq -n --rawfile p "$PROMPT" --argjson t "$MAKS" \
    '{contents:[{parts:[{text:$p}]}], generationConfig:{maxOutputTokens:$t}}' > .llm_req.json
  for deneme in 1 2 3; do
    http=$(curl -sS -o .llm_resp.json -w '%{http_code}' \
      -X POST "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent" \
      -H "x-goog-api-key: ${GEMINI_API_KEY}" -H 'Content-Type: application/json' \
      --data @.llm_req.json) || return 1
    case "$http" in
      200) jq -r '.candidates[0].content.parts[]?.text // empty' .llm_resp.json > "$OUT"
           # Kesilmiş yanıt dolu bir dosyadır: tek ayırt edici işaret bitiş
           # sebebidir. Yarım çıktıyı başarı saymak, sessiz yarım iş üretir.
           # Maliyet, işin işe yaradığından ÖNCE. Kesilmiş çağrı da faturalanır.
           maliyet_yaz "gemini/$model" \
             "$(jq -r '.usageMetadata.promptTokenCount // 0' .llm_resp.json)" \
             "$(jq -r '.usageMetadata.candidatesTokenCount // 0' .llm_resp.json)"
           if [ "$(jq -r '.candidates[0].finishReason // ""' .llm_resp.json)" = "MAX_TOKENS" ]; then
             echo "gemini: çıktı tavanda kesildi (MAX_TOKENS)" >&2; return 2
           fi
           [ -s "$OUT" ] || return 1
           echo "gemini/$model" > "${LLM_KIM:-.llm_kim}"; echo "llm: gemini/$model" >&2; return 0 ;;
      # Kota ve aşırı yük geçicidir: kısa bekleyip yeniden denemeye değer.
      # Üç deneme de tükendiğinde SEBEP YAZILIR. Bu satır yoksa hat saatlerce
      # "sağlayıcı düştü" der ve nedenini hiç söylemez — 2026-08-19'da sekiz
      # issue tam olarak böyle taslakta kaldı: 429 sessizce dönüyordu, diğer
      # bütün hata kodları mesaj basıyordu.
      429|503)
        if [ "$deneme" -lt 3 ]; then sleep $((deneme * 20)); continue; fi
        echo "gemini $http (üç deneme tükendi): $(jq -r '.error.message // "kota ya da aşırı yük"' .llm_resp.json)" >&2
        return 1 ;;
      *) echo "gemini $http: $(jq -r '.error.message // empty' .llm_resp.json)" >&2; return 1 ;;
    esac
  done
  return 1
}

claude_dene() {
  [ -n "${ANTHROPIC_API_KEY:-}" ] || return 1
  # Model bağlam penceresine göre seçilir: küçük prompt ucuz modele gider,
  # kaynak dökümü taşıyan büyük prompt yalnızca geniş pencereli modele sığar.
  # Sabit bir ucuz model, tam da yedeğe en çok ihtiyaç duyulan koşuda 400 verir.
  local model http boyut
  boyut=$(wc -c < "$PROMPT")
  if [ -n "${CLAUDE_FALLBACK_MODEL:-}" ]; then
    model="$CLAUDE_FALLBACK_MODEL"
  elif [ "$boyut" -gt 400000 ]; then
    model="claude-sonnet-5"
  else
    model="claude-haiku-4-5-20251001"
  fi
  jq -n --rawfile p "$PROMPT" --arg m "$model" --argjson t "$MAKS" \
    '{model:$m, max_tokens:$t, messages:[{role:"user", content:$p}]}' > .llm_req.json
  for deneme in 1 2 3; do
    http=$(curl -sS -o .llm_resp.json -w '%{http_code}' \
      -X POST https://api.anthropic.com/v1/messages \
      -H "x-api-key: ${ANTHROPIC_API_KEY}" -H 'anthropic-version: 2023-06-01' \
      -H 'Content-Type: application/json' --data @.llm_req.json) || return 1
    case "$http" in
      # Düşünen modellerde ilk blok thinking olabilir; metni türüne göre ayıkla.
      200) jq -r '[.content[] | select(.type=="text") | .text] | join("\n")' .llm_resp.json > "$OUT"
           # Maliyet, işin işe yarayıp yaramadığından ÖNCE yazılıyor.
           #
           # Önceki sıra tersti ve sayacı tam da bakması gereken yerde kör
           # ediyordu: tavanda kesilen bir çağrı tavan kadar çıktı token'ı
           # faturalanır, hiçbir şey üretmez ve `return 1` maliyet satırına
           # hiç ulaşmazdı. 21 Ağustos'ta denetçi böyle ~$3 yaktı ve defterde
           # tek satır görünmedi. Sayaç çalışanı ölçüp sızdıranı kaçırıyorsa
           # sayaç değildir.
           maliyet_yaz "claude/$model" \
             "$(jq -r '.usage.input_tokens // 0' .llm_resp.json)" \
             "$(jq -r '.usage.output_tokens // 0' .llm_resp.json)" \
             "$(jq -r '.usage.cache_creation_input_tokens // 0' .llm_resp.json)" \
             "$(jq -r '.usage.cache_read_input_tokens // 0' .llm_resp.json)"
           if [ "$(jq -r '.stop_reason // ""' .llm_resp.json)" = "max_tokens" ]; then
             echo "claude: çıktı tavanda kesildi (max_tokens)" >&2; return 2
           fi
           [ -s "$OUT" ] || return 1
           echo "claude/$model" > "${LLM_KIM:-.llm_kim}"; echo "llm: claude/$model" >&2; return 0 ;;
      429|529) [ "$deneme" -lt 3 ] && sleep $((deneme * 20)) && continue || return 1 ;;
      *) echo "claude $http: $(jq -r '.error.message // empty' .llm_resp.json)" >&2; return 1 ;;
    esac
  done
  return 1
}

# Bir işin **yazarın modelinden bağımsız** olması gerekiyorsa sağlayıcı elle
# seçilir: LLM_SAGLAYICI=claude|gemini. Denetim böyle bir iş — kodu yazan
# aileye kendi ödevini okutmak denetim değil, kendini işaretlemektir.
#
# Seçilen sağlayıcı düşerse yedeğe DÜŞÜLMEZ, iş ertelenir. Sıranın sessizce
# bozulması bağımsızlığı da sessizce yok eder; bu tam olarak yukarıdaki
# haftalarca fark edilmeyen arızanın deseni.

# Tavanda kesilme yedeğe geçmez ve yeniden denenmez: ikinci sağlayıcı aynı
# prompt'u aynı tavanla okuyup aynı yerde kesilir, yalnızca fatura ikiye
# katlanır. Erteleme de işe yaramaz — süpürücünün bir sonraki turu aynı
# girdiyle aynı duvara çarpar. Bu arızanın çözümü zamanda değil, girdinin
# boyutunda; o yüzden burada durup çağırana sebebi söylüyoruz.
tavan_kesildi() {
  echo "llm: çıktı tavanı (${MAKS} token) aşıldı — çağrı yanıt verdi ama metin" >&2
  echo "llm: yarıda kesildi. Bu bir sağlayıcı arızası DEĞİL: girdi, bu tavanın" >&2
  echo "llm: üretebileceğinden büyük. Yedeğe düşülmez, iş ertelenmez." >&2
  exit 2
}

case "${LLM_SAGLAYICI:-}" in
  claude)
    claude_dene; kod=$?
    [ "$kod" -eq 0 ] && exit 0
    [ "$kod" -eq 2 ] && tavan_kesildi
    echo "llm: claude seçilmişti ve düştü — iş ertelendi (yedeğe düşülmez)." >&2; exit 1 ;;
  gemini)
    gemini_dene; kod=$?
    [ "$kod" -eq 0 ] && exit 0
    [ "$kod" -eq 2 ] && tavan_kesildi
    echo "llm: gemini seçilmişti ve düştü — iş ertelendi (yedeğe düşülmez)." >&2; exit 1 ;;
esac

gemini_dene; kod=$?
[ "$kod" -eq 0 ] && exit 0
[ "$kod" -eq 2 ] && tavan_kesildi

# Yedek artık **kendiliğinden** devreye girmiyor.
#
# Sebep ölçüldü: `GEMINI_MODEL` bir önizleme modeline bağlıyken her Gemini
# çağrısı düşüyor, yedek sessizce devralıyor ve hattın tamamı haftalarca
# Claude üzerinde koşuyordu. Yedek işini kusursuz yaptığı için arıza
# faturadan başka hiçbir yerde görünmedi.
#
# Yeni kural: bir sağlayıcı düştüğünde iş **yapılmaz, ertelenir**. Koşu
# kırmızıya düşer, süpürücü çeyrek saat sonra yeniden dener (beş denemeden
# sonra bırakır ve sahibe görünür not düşer). Gemini kotası dolduysa bir
# saat sonra yenilenir; birkaç saatlik gecikme, sessizce pahalı modele
# geçmekten iyidir.
#
# Yedeği bilerek açmak için: `LLM_YEDEK=1`. Bu, "şimdi acele lazım" demektir
# ve kararı veren onu yazar — kod kendi başına vermez.
if [ "${LLM_YEDEK:-0}" = "1" ]; then
  echo "llm: birinci sağlayıcı düştü, yedek AÇIK — devralınıyor" >&2
  claude_dene; kod=$?
  [ "$kod" -eq 0 ] && exit 0
  [ "$kod" -eq 2 ] && tavan_kesildi
  echo "llm: iki sağlayıcı da yanıt vermedi" >&2
  exit 1
fi

echo "llm: birinci sağlayıcı düştü. Yedek kapalı (LLM_YEDEK=1 ile açılır);" >&2
echo "llm: iş ertelendi — süpürücü yeniden deneyecek." >&2
exit 1
