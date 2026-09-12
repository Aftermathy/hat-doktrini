#!/usr/bin/env bash
# Yeni bir projeye hattı kurar: sarmalayıcıları kopyalar, etiketleri ve
# değişkenleri açar. Gizli anahtarları **açmaz** — onlar elle girilir.
#
# Kullanım (hedef projenin kökünde):
#   curl -sL https://raw.githubusercontent.com/Aftermathy/hat-doktrini/v1/tools/kur.sh | bash
#
# Ya da depoyu klonlayıp:  bash tools/kur.sh /yol/hedef-proje
set -euo pipefail

HEDEF="${1:-$PWD}"
SURUM="${HAT_SURUM:-v1}"
KAYNAK="https://raw.githubusercontent.com/Aftermathy/hat-doktrini/${SURUM}"

AKISLAR=(danisman-deneyi denetci-nvidia denetci gemini-models gemini-pm
         gemini-revise gemini-synthesis gemini-triage internal-check
         issue-sweeper maliyet pipeline-sweeper pr-check pr-nanny
         roadmap-keeper toplu-pr)

ETIKETLER=(agent-ready internal-check needs-approval kusurlu taslak
           lokal sende needs-device gemini toplu acil)

echo "→ hedef: $HEDEF   sürüm: $SURUM"
mkdir -p "$HEDEF/.github/workflows"

echo "→ sarmalayıcılar indiriliyor"
for a in "${AKISLAR[@]}"; do
  if curl -sfL "$KAYNAK/sarmalayicilar/$a.yml" -o "$HEDEF/.github/workflows/$a.yml"; then
    printf '   %-24s ✓\n' "$a.yml"
  else
    printf '   %-24s ✗ indirilemedi\n' "$a.yml"; exit 1
  fi
done

# Sürüm etiketi sarmalayıcılarda yazılı; farklı sürüm istendiyse değiştir.
if [ "$SURUM" != "v1" ]; then
  echo "→ çağrı sürümü $SURUM yapılıyor"
  for a in "${AKISLAR[@]}"; do
    sed -i.yedek "s|hat-doktrini/.github/workflows/\(.*\)\.yml@v1|hat-doktrini/.github/workflows/\1.yml@$SURUM|" \
      "$HEDEF/.github/workflows/$a.yml" && rm -f "$HEDEF/.github/workflows/$a.yml.yedek"
  done
fi

if command -v gh >/dev/null 2>&1; then
  echo "→ etiketler açılıyor"
  for e in "${ETIKETLER[@]}"; do
    gh label create "$e" >/dev/null 2>&1 && printf '   %-18s ✓\n' "$e" \
      || printf '   %-18s zaten var\n' "$e"
  done

  echo "→ depo değişkenleri"
  gh variable set CLAUDE_ARCHITECT_MODEL --body "claude-sonnet-5"            >/dev/null 2>&1 || true
  gh variable set CLAUDE_CHECK_MODEL     --body "claude-haiku-4-5-20251001"  >/dev/null 2>&1 || true
  gh variable set CLAUDE_FALLBACK_MODEL  --body "claude-sonnet-5"            >/dev/null 2>&1 || true
  gh variable set GEMINI_MODEL           --body "gemini-3.6-flash"           >/dev/null 2>&1 || true
  gh variable set NVIDIA_ARCHITECT_MODEL --body "deepseek-ai/deepseek-v4-pro-0813" >/dev/null 2>&1 || true
  gh variable set TOPLU_ARALIK_SAAT      --body "4"                          >/dev/null 2>&1 || true
  gh variable list 2>/dev/null | awk '{printf "   %-24s %s\n", $1, $2}'
else
  echo "   gh yok — etiket ve değişkenler elle açılmalı (KURULUM.md)"
fi

cat <<'SON'

→ KALAN İŞ — bunlar elle yapılır

1. Gizli anahtarlar (değerleri sizde):
     gh secret set ANTHROPIC_API_KEY
     gh secret set GEMINI_API_KEY
     gh secret set NVIDIA_API_KEY
     gh secret set TOPLU_PAT

   TOPLU_PAT kapsamı: Contents, Workflows, Pull requests — üçü de write.

2. Projeye özgü dosyalar (kopyalanmaz, yazılır):
     .github/workflows/ci.yml   CLAUDE.md   docs/PRODUCT-DNA.md
     docs/ROADMAP.md            CONTEXT.md

3. pr-check.yml içindeki DUYU_KALIP: mimarın hangi dosyalarda çağrılacağı.
   Bu projede kullanıcının gördüğü dosyalar neredeyse ona göre yazın.

4. Doğrulama:
     gh workflow list                 # 16 iş akışı
     gh workflow run maliyet.yml      # en basit tur, yeşil bitmeli

SON
