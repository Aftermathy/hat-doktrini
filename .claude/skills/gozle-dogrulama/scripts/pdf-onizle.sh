#!/usr/bin/env bash
# PDF'i sayfa sayfa PNG'ye çevirir; üretilen belgeye gözle bakmak için.
#   pdf-onizle.sh <pdf> [cikti-dizini]
set -uo pipefail
PDF="${1:?pdf yolu gerekli}"; DIZIN="${2:-/tmp/pdf-onizle}"
mkdir -p "$DIZIN"
SAYFA=$(python3 -c "
from pypdf import PdfReader; print(len(PdfReader('$PDF').pages))" 2>/dev/null || echo 1)
echo "→ $SAYFA sayfa"
for ((i=0;i<SAYFA;i++)); do
  python3 -c "
from pypdf import PdfReader, PdfWriter
r=PdfReader('$PDF'); w=PdfWriter(); w.add_page(r.pages[$i]); w.write('$DIZIN/s$((i+1)).pdf)'.replace(')',''))" 2>/dev/null
  sips -s format png --out "$DIZIN/sayfa-$((i+1)).png" "$DIZIN/s$((i+1)).pdf" >/dev/null 2>&1
done
ls -1 "$DIZIN"/sayfa-*.png
