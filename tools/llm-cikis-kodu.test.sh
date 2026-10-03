#!/usr/bin/env bash
# `llm.sh` çıkış kodu sözleşmesinin sınaması. Ağ YOK: `PATH`'e bir `curl`
# gölgesi konuyor ve sağlayıcının döndürdüğü HTTP kodu senaryoyla veriliyor.
#
# Neden var: 2026-10-03'te Gemini `402 prepayment credits are depleted`
# döndü, `llm.sh` bunu 1 ("ertelenir, bekle geçer") olarak bildirdi ve
# süpürücü imkânsız işi yeniden denedi. 402 için ayrı kod (3) eklendi ve bu
# dosya o ayrımı kilitliyor — ayrım kodda kalır ama sınanmazsa, bir sonraki
# düzenlemede sessizce 1'e geri döner ve kimse görmez.
#
# 429 bilerek sınanmıyor: `llm.sh` o kolda 20+40 saniye uyuyor ve bir kapının
# bir dakika beklemesi, kapının kendisinden pahalı. Burada sınanan şey o kolun
# VARLIĞI değil, 402'nin ondan AYRI olması.
set -uo pipefail
BETIK="$(cd "$(dirname "$0")/.." && pwd)/.github/scripts/llm.sh"
[ -f "$BETIK" ] || { echo "llm.sh bulunamadı: $BETIK"; exit 1; }

D=$(mktemp -d); trap 'rm -rf "$D"' EXIT
mkdir -p "$D/bin"
cat > "$D/bin/curl" <<'SH'
#!/bin/bash
out=""; prev=""
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
case "$SENARYO" in
  402) printf '%s' '{"error":{"code":402,"message":"Your prepayment credits are depleted."}}' > "$out"; printf '402' ;;
  200) printf '%s' '{"candidates":[{"content":{"parts":[{"text":"merhaba"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":3}}' > "$out"; printf '200' ;;
  *) printf '%s' '{"error":{"message":"bilinmeyen senaryo"}}' > "$out"; printf '500' ;;
esac
SH
chmod +x "$D/bin/curl"
echo "istem" > "$D/prompt.md"

hata=0
dene() { # senaryo, beklenen_kod, beklenen_dizge
  local s="$1" bek="$2" kalip="$3" kod=0 log
  log="$D/log-$s.txt"
  ( cd "$D" && PATH="$D/bin:$PATH" GEMINI_API_KEY=sahte SENARYO="$s" \
      bash "$BETIK" prompt.md cikti.md 8000 ) > "$log" 2>&1 || kod=$?
  if [ "$kod" -ne "$bek" ]; then
    echo "BAŞARISIZ senaryo $s: çıkış kodu $kod beklenen $bek"; hata=1; return
  fi
  if [ -n "$kalip" ] && ! grep -q "$kalip" "$log"; then
    echo "BAŞARISIZ senaryo $s: çıktıda '$kalip' yok"; sed 's/^/    /' "$log"; hata=1; return
  fi
  echo "geçti: senaryo $s → kod $kod${kalip:+, '$kalip' basıldı}"
}

# 402 bakiye: kod 3 ve log'a basılan işaret. İşaret bir kapının girdisi
# DEĞİL (süpürücü bakiyeyi kendisi yokluyor); sahibin log'da arızayı adıyla
# görmesi için duruyor. Sınanan asıl şey çıkış kodu.
dene 402 3 "BAKIYE_BITTI"
# 402, "ertelendi" DEMEMELİ: o cümle tutulamayacak bir sözdür.
if grep -q "süpürücü yeniden deneyecek" "$D/log-402.txt"; then
  echo "BAŞARISIZ senaryo 402: 'süpürücü yeniden deneyecek' sözü veriliyor — bakiye beklemekle gelmez"; hata=1
else
  echo "geçti: senaryo 402 → erteleme sözü verilmiyor"
fi
# Sağlam yol bozulmadı.
dene 200 0 "gemini/"

[ "$hata" -eq 0 ] && echo "llm.sh çıkış kodu sözleşmesi: tamam"
exit "$hata"
