#!/usr/bin/env bash
# SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
#
# Tek bir LLM çağrısının token'ını deftere bildirir.
#
#   . .github/scripts/maliyet-yaz.sh
#   maliyet_yaz "claude/claude-sonnet-5" "$GIRDI" "$CIKTI"
#
# Neden ayrı dosya: `llm.sh` bir çalıştırılabilir, kaynak olarak alınamaz.
# Sağlayıcıyı doğrudan çağıran iş akışları (mimar denetimleri) bu yüzden
# sayacın tamamen dışında kalıyordu — 21 Ağustos'ta sayaç aylık $2 derken
# Anthropic konsolu $60 diyordu ve aradaki farkın tamamı buradan geçiyordu.
#
# Ölçülmeyen harcama, olmayan harcama gibi görünür. Sayacın kapsamı,
# ölçtüğü şeyin değil, **para harcayan her yolun** kapsamı olmak zorunda.
# Dört token alanı: girdi, çıktı, önbellek yazımı, önbellek okuması. Son
# ikisi isteğe bağlı ve eski satırlar (altı alan) okunmaya devam eder.
# Neden: önbellek açıldığında `input_tokens` önbelleklenen kısmı İÇERMEZ;
# yalnızca ilk iki alanı sayan bir defter "girdi %90 düştü" derken fatura
# artmış olabilir. Sayaç, kesilen para birimini saymak zorunda.
maliyet_yaz() {
  local kim="$1" girdi="$2" cikti="$3" onyaz="${4:-0}" onoku="${5:-0}"
  [ -n "${girdi:-}" ] && [ "$girdi" != "null" ] || girdi=0
  [ -n "${cikti:-}" ] && [ "$cikti" != "null" ] || cikti=0
  [ -n "${onyaz:-}" ] && [ "$onyaz" != "null" ] || onyaz=0
  [ -n "${onoku:-}" ] && [ "$onoku" != "null" ] || onoku=0
  local nere="${GITHUB_WORKFLOW:-yerel}"
  echo "MALIYET|${GITHUB_RUN_ID:-0}|${nere// /_}|${kim}|${girdi}|${cikti}|${onyaz}|${onoku}" >&2
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '`%s` · girdi **%s** / çıktı **%s** token\n\n' "$kim" "$girdi" "$cikti" >> "$GITHUB_STEP_SUMMARY"
  fi
}
