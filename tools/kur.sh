#!/usr/bin/env bash
# Yeni bir projeye hattı kurar ya da günceller: sarmalayıcıları ve skill'leri
# sürüm etiketinin arşivinden kopyalar, etiketleri, değişkenleri ve doktrinin
# şart koştuğu üç depo ayarını açar. Gizli anahtarları **açmaz** — onlar
# elle girilir. Birden fazla kez çalıştırmak güvenlidir.
#
# Kullanım (hedef projenin kökünde):
#   curl -sL https://raw.githubusercontent.com/Aftermathy/hat-doktrini/v1/tools/kur.sh | bash
#
# Ya da depoyu klonlayıp:  bash tools/kur.sh /yol/hedef-proje
#
# Farklı sürüm: HAT_SURUM=v2 bash tools/kur.sh
set -euo pipefail

HEDEF="${1:-$PWD}"
SURUM="${HAT_SURUM:-v1}"
ARSIV="https://github.com/Aftermathy/hat-doktrini/archive/refs/tags/${SURUM}.tar.gz"

# Tek arşiv, on altı ayrı indirme değil: yarım kalan kurulum (dokuzu inmiş,
# yedisi inmemiş) sessizce eksik bir hat demek. Arşiv ya tamamen gelir ya
# hiç gelmez.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "→ hedef: $HEDEF   sürüm: $SURUM"
if ! curl -sfL "$ARSIV" | tar -xz -C "$TMP"; then
  echo "   arşiv indirilemedi: $ARSIV — etiket var mı?" >&2; exit 1
fi
KOK="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"

echo "→ sarmalayıcılar"
mkdir -p "$HEDEF/.github/workflows"
for f in "$KOK"/sarmalayicilar/*.yml; do
  a="$(basename "$f")"
  cp "$f" "$HEDEF/.github/workflows/$a"
  # Sürüm etiketi sarmalayıcılarda yazılı; farklı sürüm istendiyse değiştir.
  if [ "$SURUM" != "v1" ]; then
    sed -i.yedek "s|hat-doktrini/.github/workflows/\(.*\)\.yml@v1|hat-doktrini/.github/workflows/\1.yml@$SURUM|" \
      "$HEDEF/.github/workflows/$a" && rm -f "$HEDEF/.github/workflows/$a.yedek"
  fi
  printf '   %-24s ✓\n' "$a"
done

# Skill'ler yerel ajanın (sahibin makinesindeki asistan) araçları: sorgulama,
# prototip, şartname uyumu, prompt bütçesi. Doktrin onlara adıyla atıf
# yapıyor; kopyalanmazsa atıf ölü kalır. Sürüm arşivinde yoksa (v1) atlanır.
if [ -d "$KOK/.claude/skills" ]; then
  echo "→ skill'ler"
  mkdir -p "$HEDEF/.claude/skills"
  cp -R "$KOK/.claude/skills/." "$HEDEF/.claude/skills/"
  ls "$KOK/.claude/skills" | sed 's/^/   /'
else
  echo "→ skill'ler: bu sürümün arşivinde yok, atlandı"
fi

# Notlar tek dosyaya değil, dizine yazılır (çakışma yüzeyi). Merkez iş
# akışları bu dizini özetleyerek okur; yoksa özet boş döner, hata vermez.
mkdir -p "$HEDEF/docs/notes"
[ -n "$(ls -A "$HEDEF/docs/notes" 2>/dev/null)" ] || : > "$HEDEF/docs/notes/.gitkeep"

if ! command -v gh >/dev/null 2>&1; then
  echo "   gh yok — etiket, değişken ve depo ayarları elle açılmalı (KURULUM.md)"
  exit 0
fi
REPO="$(cd "$HEDEF" && gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "$REPO" ]; then
  echo "   hedef bir GitHub deposu değil (ya da gh yetkisiz) — etiket, değişken ve ayarlar atlandı"
  exit 0
fi
cd "$HEDEF"
echo "→ depo: $REPO"

# Etiketler anlam taşır; rengi ve açıklaması da. Anlamları AGENT-WORKFLOW.md'de.
echo "→ etiketler"
etiket() {
  if gh label create "$1" --color "$2" --description "$3" --force >/dev/null 2>&1; then
    printf '   %-18s ✓\n' "$1"
  else
    printf '   %-18s ✗ açılamadı\n' "$1"
  fi
}
etiket taslak         c5def5 "Sahibin ham notu; triyaj calisir"
etiket internal-check 1d76db "Ic kontrolde: muhendis ve mimar gorus bildirecek"
etiket needs-approval fbca04 "Sartnameye cevrildi, onay bekliyor"
etiket agent-ready    0e8a16 "Otonom ajan alabilir; yalnizca sahip verir"
etiket kusurlu        e99695 "Onaylanmis sartname kusurlu bulundu; ic kontrole doner"
etiket lokal          5319e7 "Yerel ajanin isi ya da hattin kendi kurallari; hat dokunmaz"
etiket sende          b60205 "Yalnizca sahibin yapabilecegi is: cihaz, hesap, odeme"
etiket needs-device   d93f0b "Fiziksel cihaz/donanim gerektirir; sende ile gelir"
etiket gemini         5319e7 "Urun yoneticisi onerdi"
etiket toplu          0052cc "Toplu sunum PR'i; denetci yalnizca buna cagrilir"
etiket sunuma-girmez  d4c5f9 "Bu PR toplu sunuma alinmaz"
etiket acil           e11d21 "Oncelik seridi: onaylaninca sira atlar, kapiyi atlamaz"

# Var olan değişkenin üstüne yazılmaz: proje kendi modelini seçmiş olabilir.
echo "→ depo değişkenleri"
degisken() {
  if gh variable get "$1" >/dev/null 2>&1; then
    printf '   %-24s (zaten var, dokunulmadı)\n' "$1"
  else
    gh variable set "$1" --body "$2" >/dev/null && printf '   %-24s = %s\n' "$1" "$2"
  fi
}
degisken CLAUDE_ARCHITECT_MODEL "claude-sonnet-5"
degisken CLAUDE_CHECK_MODEL     "claude-haiku-4-5-20251001"
degisken CLAUDE_FALLBACK_MODEL  "claude-sonnet-5"
degisken GEMINI_MODEL           "gemini-3.6-flash"
degisken NVIDIA_ARCHITECT_MODEL "deepseek-ai/deepseek-v4-pro-0813"
degisken TOPLU_ARALIK_SAAT      "4"
if ! gh variable get DUYU_KALIP >/dev/null 2>&1; then
  echo "   DUYU_KALIP               tanımsız — mimarın çağrılacağı dosya kalıbı; aşağıda"
fi

# Üç depo ayarı doktrinin şartı (AGENT-WORKFLOW.md, "Sunum adımı"): dosya
# olarak durmazlar, o yüzden burada. Squash/rebase kapalı: sunumdaki tekil
# PR'ların commit'leri main'den erişilemez olur ve Closes #N hiç işlemez.
echo "→ depo ayarları"
gh api -X PATCH "repos/$REPO" \
  -F allow_merge_commit=true -F allow_squash_merge=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  --jq '"   merge commit: \(.allow_merge_commit)  squash: \(.allow_squash_merge)  rebase: \(.allow_rebase_merge)  dal silinir: \(.delete_branch_on_merge)"' \
  || echo "   birleştirme ayarları yazılamadı — Settings > General > Pull Requests'ten elle"
if gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
     -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true >/dev/null 2>&1; then
  echo "   Actions PR açabilir ve onaylayabilir: açık"
else
  echo "   Actions izni yazılamadı — Settings > Actions > General > Workflow permissions'tan elle"
fi
if [ "$(gh repo view --json isPrivate -q .isPrivate)" = "true" ]; then
  echo "   depo ÖZEL: Actions dakikası ücretsiz kotayla sınırlı; bittiğinde her job iki saniyede, log üretmeden düşer"
fi

cat <<'SON'

→ KALAN İŞ — bunlar elle yapılır

1. Gizli anahtarlar (değerleri sizde):
     gh secret set ANTHROPIC_API_KEY
     gh secret set GEMINI_API_KEY
     gh secret set NVIDIA_API_KEY
     gh secret set TOPLU_PAT

   TOPLU_PAT kapsamı: Contents, Workflows, Pull requests — üçü de write.

2. Mimarın çağrılacağı dosya kalıbı — kullanıcının gördüğü dosyalar:
     gh variable set DUYU_KALIP --body '^\+\+\+ b/(src/|.*\.css$)'
   Dar tutun; denetim PR başına fiyatlanıyor. (v1'de kalıp merkezde
   gömülü ve Vault'un yolları; v2'den itibaren bu değişken okunur.)

3. Projeye özgü dosyalar (kopyalanmaz, yazılır):
     CLAUDE.md   CONTEXT.md   docs/PRODUCT-DNA.md   docs/ROADMAP.md
     docs/roles/mimar.md   .agentrc   .github/workflows/ci.yml
     docs/ENGINEERING-NOTES.md (geçici işaretçi; KURULUM.md'ye bakın)

4. Doğrulama:
     gh workflow list                 # 16 iş akışı
     gh workflow run maliyet.yml      # en basit tur, yeşil bitmeli

SON
