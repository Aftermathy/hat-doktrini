#!/usr/bin/env bash
# İnsan-döngüde teşhis tezgâhı. Ajanın koşamadığı adımları insana yaptırır ve
# cevabı yapılandırılmış olarak geri verir.
#
# Kullanım: adımları ADIMLAR dizisine yaz, çalıştır, çıktıyı issue'ya yapıştır.
set -uo pipefail

adim() { printf '\n\033[1m› %s\033[0m\n' "$1"; read -r -p "  bitince Enter… " _; }
yakala() { local ad="$1" soru="$2"; read -r -p "  $soru: " cevap; echo "$ad=$cevap" >> "$CIKTI"; }
sec()   { local ad="$1" soru="$2"; shift 2; printf '  %s\n' "$soru"; select s in "$@"; do echo "$ad=$s" >> "$CIKTI"; break; done; }

CIKTI="${CIKTI:-/tmp/teshis-$(date +%H%M%S).txt}"
: > "$CIKTI"
echo "teşhis oturumu → $CIKTI"

# ── ADIMLAR: her teşhiste bu blok yeniden yazılır ───────────────────────────
adim "Uygulamayı kapat, arka plandan da kaldır."
adim "Uygulamayı aç ve arızayı tekrar üret."
yakala "ekranda_yazan" "Ekranda görünen hata cümlesi (yoksa: yok)"
sec    "asama"          "Hangi aşamada durdu?" "açılış" "okuma" "gönderme" "yanıt" "bilinmiyor"
yakala "gecen_sure"     "Kaç saniye sürdü"
adim   "Varsa iz kutusunu aç ve son üç satırı oku."
yakala "iz_son_satir"   "İz kutusundaki SON satır"
# ───────────────────────────────────────────────────────────────────────────

printf '\n\033[1mYapıştırılacak çıktı:\033[0m\n\n'
cat "$CIKTI"
