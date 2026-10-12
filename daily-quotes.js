const quoteStarts = [
  "Küçük bir adım",
  "Sabırlı bir çaba",
  "İçten bir başlangıç",
  "Güzel bir düşünce",
  "Düzenli bir çalışma",
  "Cesur bir karar",
  "Açık bir zihin",
  "Nazik bir yaklaşım",
  "Gerçekçi bir hedef",
  "İyi bir alışkanlık",
  "Sakin bir zihin",
  "Küçük bir iyilik",
  "Özenli bir davranış",
  "Yeni bir deneyim",
  "Güçlü bir irade",
  "Dürüst bir çaba",
  "Doğru bir soru",
  "Anlamlı bir mola",
  "İyi bir plan",
  "Kararlı bir duruş",
  "Paylaşılan bir bilgi",
  "Yapıcı bir fikir",
  "İçten bir teşekkür",
  "Bilinçli bir seçim",
  "Umut dolu bir başlangıç"
];

const quoteEnds = [
  "yarına umut taşır.",
  "zamanla büyük bir fark yaratır.",
  "gelişimin kapısını açar.",
  "başarıya giden yolu aydınlatır.",
  "insana yeni bir güç verir.",
  "güzel sonuçların temelini atar.",
  "ilerlemenin değerli bir parçasıdır.",
  "kendine güveni güçlendirir.",
  "hayata yeni bir bakış kazandırır.",
  "zorlukları aşmayı kolaylaştırır.",
  "geleceğe sağlam bir iz bırakır.",
  "bugünü daha anlamlı kılar.",
  "yeni fırsatlara alan açar.",
  "emeğin değerini ortaya çıkarır.",
  "değişimin başlangıcı olabilir."
];

const noteActions = [
  "Bugün küçük bir hedef belirle",
  "Bir işi küçük adımlara böl",
  "Kendine biraz zaman ayır",
  "Öğrenmeye açık kal",
  "Bir sonraki adımına odaklan",
  "İyi yaptığın bir şeyi fark et",
  "Gerektiğinde yardım iste",
  "Birine içtenlikle teşekkür et",
  "Kısa bir mola vermeyi dene",
  "Önceliklerini gözden geçir",
  "Yeni bir yöntem dene",
  "Bir işi dikkatle tamamla",
  "Kendine gerçekçi hedefler koy",
  "Bugün güzel bir ayrıntı ara",
  "Bir fikrini paylaş",
  "Bir soruyu açıkça sor",
  "Küçük bir iyilik yap",
  "Dünden öğrendiğin bir şeyi hatırla",
  "Kendine güvenmeyi hatırla",
  "Bir alışkanlığını sürdür",
  "İşini kolaylaştıracak bir yol bul",
  "Bir hedefini yeniden değerlendir",
  "Günün temposunu fark et",
  "Başladığın işe yeniden odaklan",
  "Bugün kendin için de bir şey yap"
];

const noteReminders = [
  "Küçük ilerlemeleri küçümseme.",
  "Her şeyi aynı anda çözmek zorunda değilsin.",
  "Kendi hızında ilerlemek de değerlidir.",
  "Kendine karşı nazik ol.",
  "İlerleme bazen sessizce gerçekleşir.",
  "Dinlenmenin de önemli olduğunu unutma.",
  "Bir hata, yeni bir öğrenme fırsatıdır.",
  "Yardımlaşmak işleri kolaylaştırabilir.",
  "Bugünkü emeğinin değerini bil.",
  "Kusursuzluk yerine gelişime odaklan.",
  "Güzel sonuçlar zaman alabilir.",
  "Küçük başarılarını fark et.",
  "Gerektiğinde yeniden başlayabilirsin.",
  "Her gün aynı enerjide olmak zorunda değilsin.",
  "Bir sonraki adımı sakinlikle seç."
];

const themes = [
  "Özgüven",
  "Sabır",
  "Disiplin",
  "Umut",
  "Başarı",
  "Ekip çalışması",
  "Huzur",
  "Yeni başlangıçlar",
  "Öğrenmek",
  "Denge",
  "Cesaret",
  "İletişim",
  "Sorumluluk",
  "Değişim",
  "Minnettarlık"
];

window.dailyQuotes = Array.from({ length: 365 }, function (_, i) {
  const quoteStart = quoteStarts[i % quoteStarts.length];
  const quoteEnd = quoteEnds[
    Math.floor(i / quoteStarts.length)
  ];

  const noteAction = noteActions[i % noteActions.length];
  const noteReminder = noteReminders[
    Math.floor(i / noteActions.length)
  ];

  return {
    quote: quoteStart + ", " + quoteEnd,
    note: noteAction + ". " + noteReminder,
    theme: themes[i % themes.length]
  };
});