---
name: ajan-hatti
description: Otonom ajan hattı kurmanın ve kapılarını korumanın kuralları — etiket akışı, sunum PR'ı ile denetim ekonomisi, kimin neyi onaylayabildiği, sessiz arıza sınıfları. Use when building or changing an autonomous agent pipeline on GitHub, or when its gates misbehave.
---

# Ajan hattı

Vault'un hattından çıkarılmış kurallar. Hepsi bir arızadan sonra yazıldı;
sırası önemsiz, hiçbiri süs değil.

## Kapılar

**`agent-ready` etiketini otomasyon asla koyamaz.** Otonom bir hattın tek
geçilemez kapısı budur: ajan kendi işini onaylayamaz. Vekâlet açıkça verilir
ve kapsamı yazılır; verildiğinde yerel ajan onaylayabilir ve birleştirebilir,
ama vekâlet o oturuma aittir.

**Etiketi olmayan issue, kimsenin bakmadığı issue'dur.** Hattın her kolu bir
etikete bakar; "etiketi olmayan"a bakan yoktur. Ölçüldü: ajanların kendi
açtığı arıza raporları (`agent-ready` veremedikleri için etiketsiz açılan)
iki gün boyunca hiçbir kolun görmediği yerde durdu. Süpürücünün ilk kolu
etiketsiz her açık issue'yu akışın girişine koymalı.

**Kalan tek kabul ölçütü cihazsa iş `sende`ye geçer.** `agent-ready` "ajan
alabilir" demektir; alacak bir şey yokken orada durması ajanı yanıltır.
Ölçüldü: bütün kod kapıları kapanmış bir issue `agent-ready` + `acil` olarak
kaldı ve mühendis onu **her turda en önce** aldı — dört tur, "yapılacak iş
yok" demek için harcandı.

**Şartname yazılmadan önce `main`'e bakılır.** *"Şu koruma yok" diyen bir
madde, ilk iş korumayı yazmak değil yokluğunu doğrulamaktır.* Var olan bir
davranışı ikinci kez yazmak diff'te de testte de görünmez; yalnızca haritada
"tamamlandı" diye görünür. Vault'ta aynı iş üç kez şartnameye çevrildi.

## Denetim ekonomisi — sunum PR'ı

**Denetçi fiyatı PR başına, satır başına değil.** Aynı satırlar 40 parçada 40
kez, tek parçada bir kez ödenir. Hat günde 20-40 PR açıyorsa maliyet koddan
değil **parçalanmadan** gelir.

Çözüm: pencerede biriken hazır PR'ları tek bir **sunum dalında** birleştirip
sahibin önüne tek PR çıkarmak. Kurulurken karşılaşılan tuzaklar:

- **`--no-ff` ve merge commit şart.** Squash, tekil PR'ların commit'lerini
  `main`'den erişilemez yapar; GitHub onları "birleşti" saymaz ve `Closes #N`
  hiç işlemez. Yanlış düğme tıklanamasın diye squash/rebase depo ayarından
  kapatılır.
- **`GITHUB_TOKEN` ile açılan PR'da CI kendiliğinden koşmaz** (özyineleme
  koruması). CI dispatch edilir; ama `workflow_dispatch` koşusunun check
  suite'i hiçbir PR'a bağlı olmadığı için hüküm kapıda **görünmez**.
- **Hükmü, koşuyu başlatan taraf yazar.** Arada bir `workflow_run` aynası
  denendi ve güvenilmez çıktı: bir sunumda yazdı, bir sonrakinde olay hiç
  doğmadı. Zincire eklenen her halka, hükmü kaybetmenin bir yolu daha.
- **Koşu aranmaz, işaretlenir.** "En yeni koşu" diye seçmek yanlış koşuyu
  bulur: bot'un açtığı PR için GitHub aynı SHA'ya ikinci bir koşu yaratıp
  onay bekler durumda parkeder ve hüküm ondan okunur. Dispatch girdisiyle
  taşınan bir kimlik, eşleşmeyi tek ve kesin yapar.
- **İş akışı dosyasına dokunan aday sunuma alınmaz.** `GITHUB_TOKEN`
  `.github/workflows/` altına yazamaz; tek böyle aday bütün turu düşürür
  (ölçüldü: 26 saat, 23 ardışık kırmızı koşu). O PR'ları vekil elle
  birleştirir.
- **Kilitlenmeyi açan değişiklik kilitlenmeye tabi tutulmaz.** Kapıyı onaran
  PR, kırık kapının arkasında bekletilmez.

## Sessiz arıza sınıfları

**`success` yazan bir denetçi fark edilmez.** CodeRabbit saatlik sınıra
takıldığında commit durumunu `success` / "Review rate limited" diye yazıyor:
yeşil bir tik, hiç başlamamış bir inceleme. Ölçüldü: son 25 PR'ın 2'si hiç
incelenmeden yeşil geçti.

**Bilinmeyeni güvenli saymak, kontrolü hiç koymamaktır.** GitHub
birleştirilebilirliği `UNKNOWN` döndürebiliyor; bu "çakışma yok" değil "henüz
bilmiyorum" demek — ve belirsizlik tam da push sonrası, çakışmanın en olası
olduğu anda oluşuyor.

**Hata yorumu ilerleme sayılmaz.** "Denetim yapılamadı" dolu bir yorumdur;
yorum sayan nöbet onu tamamlanmış denetim sanır ve zincir kendi kendini
besleyen bir döngüye girer. İlerleme sayacı yorumun **varlığını** değil
**başarılı olduğunu** saymalı.

**Görsel yoruma konur, gövdeye değil.** Triyaj issue gövdesini şartnameye
çevirirken yeniden yazıyor; gövdedeki her ekran görüntüsü bağlantısı orada
düşer ve mimar, bakılsın diye açılmış bir tura metinden girer.

**Elle tetikleme gerekiyorsa bu bir hata raporudur.** Düzeltme o issue'ya
değil, süpürücüye ya da kapıya yapılır. Elle tetiklemenin *kendisi*
çalışmıyorsa iki kat öyle.

## Süpürücü

Olay tabanlı hattın sessiz arızası şudur: tek bir tetikleyici düşer ve iş
orada durur; kimse hata görmez, yalnızca hiçbir şey ilerlemez. Çeyrek saatte
bir takılmışları iten bir süpürücü şart. Ama **sonsuza kadar itmez**: aynı iş
beş kez itilip ilerlemiyorsa arıza o iştedir; süpürücü susar ve görünür bir
not bırakır. Sessizce vazgeçmek, sonsuza kadar denemek kadar kötüdür.
