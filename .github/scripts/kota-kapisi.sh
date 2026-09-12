#!/usr/bin/env bash
# SINIF: GENEL — projeden bağımsız, değiştirmeden kopyalanır
#
# Kota duvarını koddaki bir arızadan ayırır ve **görünür** kılar.
#
# Sorun şuydu: kurulum (installation) kotası tükendiğinde `gh` ilk çağrıda
# `GraphQL: API rate limit already exceeded for site ID installation.` yazıp
# düşüyor. Kol kırmızı biter, log'a tek satır düşer ve dışarıdan bakan bunu
# kodun kırıldığı sanır — oysa kod çalışıyor, kapı kapalı. İki arızayı aynı
# hanede toplamak, düzeltmeyi yanlış yerde aratır.
#
# Bu kapı hükmü **değiştirmiyor**: kota duvarına çarpan kol yine kırmızı
# biter. Değişen tek şey, sebebin okunabilir olması. Yeşil bitirmek daha
# kötü olurdu — bakılmamış bir PR "bakıldı" görünür ve doktrinin kendi
# kuralı bunu yasaklıyor ("Derleyici susarsa hat durur, ilerlemez").
#
# Kullanım:
#   source .github/scripts/kota-kapisi.sh
#   if ! LISTE=$(gh pr list ... 2>/tmp/gh-hata); then
#     kota_kapisi "$(cat /tmp/gh-hata)" "PR bakıcısı · çakışma onarımı"
#     exit 1
#   fi

# Aranan imzalar. GitHub aynı durumu iki ayrı metinle yazıyor (GraphQL kolu
# `already exceeded`, REST kolu `rate limit exceeded`) ve ikincil bir sınır
# olan `secondary rate limit` de aynı sınıfa girer: üçünde de yapılacak şey
# beklemektir, kod değiştirmek değil.
KOTA_IMZALARI='API rate limit already exceeded|rate limit exceeded|secondary rate limit|You have exceeded a secondary rate limit'

# 0 döner: kota duvarı saptandı ve rapor edildi.
# 1 döner: bu bir kota arızası değil — çağıran kendi hatasını yazsın.
kota_kapisi() {
  local hata="${1:-}" kol="${2:-bilinmeyen kol}"

  if ! printf '%s' "$hata" | grep -qEi "$KOTA_IMZALARI"; then
    return 1
  fi

  # Annotation koşu listesinde görünür; özet ise koşu sayfasının başında
  # durur. İkisi ayrı yerlerde okunuyor ve arıza türü ikisinde de aranıyor.
  printf '::warning title=Kota duvarı::%s — GitHub API kotası tükendi, bu kol koşamadı\n' "$kol"

  # `GITHUB_STEP_SUMMARY` yalnızca Actions içinde tanımlı. Yerelde çalışan
  # bir denemede bu satır sessizce atlanmalı, script düşmemeli: kapının
  # kendisi arıza kaynağı olamaz.
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      printf '### Kota duvarı — `%s`\n\n' "$kol"
      printf 'Bu kol koşamadı ama **sebep kodda değil**: GitHub API kurulum kotası tükenmiş\n'
      printf 'durumda ve ilk çağrı reddedildi.\n\n'
      printf '```\n%s\n```\n\n' "$(printf '%s' "$hata" | head -3)"
      printf 'Yapılacak: kod aranmaz. Kota penceresi dolana kadar beklenir; iş bir sonraki\n'
      printf 'zamanlanmış turda kendiliğinden yeniden denenir. Duvar tekrarlıyorsa yükü ölçen\n'
      printf 'araç `node .github/scripts/api-yuku.mjs` en çok çağrı yapan kolları adlandırır.\n\n'
    } >> "$GITHUB_STEP_SUMMARY"
  fi

  printf '%s: kota duvarı — bu kol hiç koşmadı (kod arızası değil).\n' "$kol"
  return 0
}
