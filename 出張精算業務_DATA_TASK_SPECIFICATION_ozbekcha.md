# MA'LUMOT VAZIFASI SPETSIFIKATSIYASI — Xizmat safari hisob-kitobini tasdiqlash tekshiruvini avtomatlashtirish / Solishtirish tekshiruv varog'ini yaratish

> To'ldirilgan versiya / Data Analytics, Excel VBA, RPA, Power Automate vazifalari uchun
> (asl `.docx` faylning to'liq mazmuni o'zbekchaga tarjima qilingan)

**Tizimlar haqida qisqacha:**
- **楽々精算 (Rakuraku Seisan)** — xizmat safari xarajatlarini hisob-kitob qilish / tasdiqlash tizimi (xarajat tizimi).
- **楽々勤怠 (Rakuraku Kintai)** — ish vaqti / davomat tizimi (kelish-ketish, ish boshlanishi/tugashi).
- **一次承認 (ichiji shounin)** — birinchi bosqich tasdiqlovchi (1-darajali approver).
- **二次承認 (niji shounin)** — ikkinchi bosqich tasdiqlovchi (2-darajali approver).
- **差戻し (sashimodoshi)** — qaytarib yuborish / tuzatishga qaytarish.
- **突合 (totsugou)** — solishtirish / ikki manba ma'lumotini moslashtirish (matching).

---

## Maqsad (Purpose)

Ushbu spetsifikatsiya — **楽々精算 (xarajat) va 楽々勤怠 (davomat) ma'lumotlarini solishtirib, xizmat safari hisob-kitobini birinchi va ikkinchi bosqich tasdiqlash uchun zarur tekshiruv nuqtalarini bitta tekshiruv varog'iga jamlash** vazifasining spetsifikatsiyasi.

Ishni boshlashdan oldin quyidagilarni manfaatdor tomonlar bilan kelishib olish va birinchi bosqich tasdiqlovchining tekshiruv ishini yengillashtirish maqsad qilinadi:

- Ma'lumot olish imkoniyati (qaysi ma'lumotni olsa bo'ladi)
- Solishtirish kaliti (matching key)
- Baholash qoidalari
- Qaytarib yuborish jarayoni
- Bosqichma-bosqich avtomatlashtirish doirasi

---

## 1. Umumiy ko'rinish (Overview)

| Element | Mazmuni |
| --- | --- |
| **Vazifa nomi** | Xizmat safari hisob-kitobini tasdiqlash tekshiruvini avtomatlashtirish / solishtirish tekshiruv varog'ini yaratish |
| **Maqsad** | Birinchi va ikkinchi bosqich tasdiqlovchilarning tekshiruv ishini samarali qilish, yukni kamaytirish. Tasdiqlash paytida tasdiqlovchilar 楽々精算 va 楽々勤怠 ni bir nechta ekranda tekshirayotgan holatni qayta ko'rib chiqib, zarur tekshiruv punktlarini ro'yxatga olish, solishtirish va baholash orqali yukni kamaytirish. |
| **Mavjud holat (Background)** | Hozir 楽々精算 dagi tasdiqlanmagan arizani ochib, safar muddati, manzil, maqsad, yo'l haqi, turar joy haqi, kunlik nafaqa (日当) va kvitansiyani tekshirgach, 楽々勤怠 dagi ish boshlanishi/tugashini alohida ekranda tekshiradi. Tekshiruv nuqtalari odamga bog'liq bo'lib qoladi, ikki marta tekshirish, tekshiruv tushib qolishi, qaytarib yuborish ko'rsatmalarining har xilligi yuzaga keladi. |
| **Avtomatlashtirish doirasi** | Boshlang'ich doira = "Yuklab olingan ma'lumotni bitta papkaga joylab, Excel VBA yoki Python bilan birlashtirilgan tekshiruv varog'ini avtomatik yaratish". Hamda tekshiruv varog'ida tasdiqlash/qaytarishni 楽々精算 ga aks ettirish. **Ma'lumotni yuklab olish, yuklash (upload) va tasdiqlashning o'zi boshlang'ich doiradan tashqarida.** Yuklab olishni avtomatlashtirish va upload ni RPA / Power Automate bilan avtomatlashtirish Phase2 dan keyin ko'rib chiqiladi. |
| **Foydalanuvchilar** | Birinchi bosqich tasdiqlovchi, ikkinchi bosqich tasdiqlovchi |

---

## 2. Kirish ma'lumotlari (Input Data)

### 2.1 Ma'lumot manbalari (Data Source)

| Ma'lumot manbasi | Format | Davriyligi | Egasi (Owner) | Maqsad / Izoh |
| --- | --- | --- | --- | --- |
| 楽々精算 tasdiqlanmagan ro'yxat | Excel / CSV | Haftalik yoki davr bo'yicha | Birinchi tasdiqlovchi | Tasdiqlanadigan safar arizasi va tafsilot ma'lumoti. Dastlab qo'lda yuklab olish ko'zda tutiladi. |
| 楽々勤怠 ish natijalari | Excel / CSV | Haftalik yoki davr bo'yicha | Birinchi tasdiqlovchi | Ish kuni, ish boshlanishi/tugashi, ta'til/dam olish, tungi/qo'shimcha vaqt va h.k. tekshirish uchun. |
| Baholash qoidalari masteri | Word | Yangilanganda | Biznes mas'uli | 50km/100km, turar joy limiti, kunlik nafaqa, turish yordami, yo'l haqi nafaqasi, qaytarish shartlarini belgilaydi. |
| Xodimlar masteri / Bo'lim masteri | Excel / CSV | Oylik yoki yangilanganda | Boshqaruv bo'limi | Xodim raqami, ism, bo'lim, tasdiqlovchi, email manzilini birlashtiradi. |
| Tasdiqlash marshruti masteri | Excel / CSV | Yangilanganda | Boshqaruv bo'limi | Birinchi/ikkinchi tasdiqlovchi, vakil tasdiqlovchi, bo'lim bo'yicha tasdiqlash marshrutini tekshirish uchun. |
| Tashrif joyi / mijoz / filial masteri | Excel / CSV | Yangilanganda | Boshqaruv bo'limi | Safar manzili nomidagi farqlar, masofa baholash, ish yo'lidan tashqari ekanligini aniqlash, mijoz nomini moslashtirish uchun. |
| Kvitansiya rasmi / ilova ma'lumoti | Fayl / meta-ma'lumot | Ariza bo'yicha | 楽々精算 | Phase1 da ilova bor-yo'qligi va summasini tekshirishgacha. OCR o'qish Phase2/3 da nomzod. |

### 2.2 Ma'lumot tuzilmasi (Data Structure)

> Asosiy kirish ustunlari quyidagicha ko'zda tutiladi. Haqiqiy ustun nomlari tizim chiqargan punkt nomlariga moslab **mapping jadvalida yakuniy aniqlanadi**.

| Manba | Ustun nomi | Tavsif | Misol | Zarurligi |
| --- | --- | --- | --- | --- |
| 楽々精算 | Xodim raqami | Tizimlardagi ism/bo'lim/email/user ID ni birlashtiruvchi rasmiy shaxs kaliti. Ma'lumotda bo'lmasa xodimlar masteri orqali biriktiriladi. | 100123 | Zarur |
| 楽々精算 | Ism | Ariza beruvchi nomi. Xodimlar masteri bilan moslashtiriladi. **Yolg'iz o'zi unikal kalit bo'lmaydi.** | Yamada Taro | Zarur |
| 楽々精算 | Bo'lim | Ism takrorlanganda yordamchi kalit, tasdiqlovchini aniqlash, bo'lim bo'yicha yig'ish uchun. | Texnika 1-bo'lim | Zarur |
| 楽々精算 | Email / Login ID | Olish mumkin bo'lsa, xodimlar masteri moslashtirishda ustuvor kalit. | yamada@example.co.jp | Tavsiya |
| 楽々精算 | Ariza raqami / Hujjat raqami | Safar arizasini unikal aniqlovchi ID. 楽々精算 ichidagi unikal kalit. | TR-2026-0001 | Zarur |
| 楽々精算 | Ariza/Tasdiqlash holati | Tasdiqlanmagan, qaytarilgan, tasdiqlangan va h.k. | Tasdiqlanmagan | Zarur |
| 楽々精算 | Safar sanasi / muddati | Safar sanasi, boshlanish, tugash sanasi. | 2026/05/20-2026/05/22 | Zarur |
| 楽々精算 | Jo'nash / yetib borish joyi / tashrif joyi | Yo'nalish va manzilni tekshirish. | Tokio → Osaka / A kompaniya | Zarur |
| 楽々精算 | Safar maqsadi / Izoh | Ish faktini, buyurilgan safar ekanligini tekshirish. | Texnik xizmat, uchrashuv | Zarur |
| 楽々精算 | Harakat boshlanishi/tugashi vaqti | Mehnat/sog'liq boshqaruvi, ish vaqtidan tashqari harakatni tekshirish. | 07:30 / 21:30 | Zarur |
| 楽々精算 | Yo'l haqi / Turar joy / Kunlik nafaqa / Turish yordami / Ovqat yordami / Nafaqa jami | To'lov summasi, qoidaga moslikni tekshirish. | 15,000 / 10,000 / 2,500 | Zarur |
| 楽々精算 | Tunash kunlari soni / Rahbar tasdig'i | Turar joy haqi, nafaqa, tunash tasdig'i mosligini tekshirish. | 2 kecha / tasdiqlangan | Zarur |
| 楽々精算 | Kvitansiya bor-yo'qligi / Ilova bor-yo'qligi / Ilova ID | Dalil tekshirish, ilova tushib qolishini tekshirish. | Bor / receipt_001.pdf | Zarur |
| 楽々精算 | Minus hisob-kitob / Oy oshib ketishi / To'lov vaqti | Istisno qayta ishlash, takroriy hisob-kitobni tekshirish. | Minus hisob-kitob bor | Ixtiyoriy |
| 楽々勤怠 | Xodim raqami | Birlashtiruvchi rasmiy shaxs kaliti. Bo'lmasa xodimlar masteri orqali biriktiriladi. | 100123 | Zarur |
| 楽々勤怠 | Ism | Ariza beruvchi nomi. Xodimlar masteri bilan moslashtiriladi. Yolg'iz unikal kalit emas. | Yamada Taro | Zarur |
| 楽々勤怠 | Bo'lim | Ism takrorlanganda yordamchi kalit, bo'lim aniqlash uchun. | Texnika 1-bo'lim | Zarur |
| 楽々勤怠 | Email / Login ID | Olish mumkin bo'lsa moslashtirishda ustuvor kalit. | yamada@example.co.jp | Tavsiya |
| 楽々勤怠 | Ish kuni / boshlanishi / tugashi / tanaffus / davomat turi | Ish natijasi, uzoq/tungi/dam olish kuni ishini tekshirish. | 2026/05/20 / 08:30 / 20:00 / safar | Zarur |
| 楽々勤怠 | Davomat kiritilgan-yo'qligi / Tuzatish holati | Davomat kiritilmagan, vakil kiritgan, tuzatish tushib qolishini tekshirish. | Kiritilgan | Zarur |
| Baholash qoidalari masteri | Qoida sharti / Baho turi / Qaytarish matni | Avtomatik baholash, qaytarish nomzodini yaratishda. | 50km dan kam — kunlik nafaqaga kirmaydi | Zarur |
| Xodimlar masteri | Xodim raqami | Shaxs ma'lumotini birlashtiruvchi rasmiy kalit. | 100123 | Zarur |
| Xodimlar masteri | Ism | Tizimlardagi ism bilan moslashtirish. | Yamada Taro | Zarur |
| Xodimlar masteri | Bo'lim | Ism takrorlanganda yordamchi kalit, marshrut/bo'lim yig'ish uchun. | Texnika 1-bo'lim | Zarur |
| Xodimlar masteri | Email / Login ID | Tizimlar bilan moslashtirish. Olinса, ism+bo'limdan ustun. | yamada@example.co.jp | Tavsiya |
| Xodimlar masteri | Ishlash holati | Pensiyaga chiqqan/ko'chgan xodimni aniqlash. | Ishlamoqda | Tavsiya |

---

## 3. Manbalar / Yordamchi hujjatlar (Reference)

> Ushbu vazifa kirish ma'lumotlari orasidagi solishtirish va qoida baholashga asoslanadi, shuning uchun quyidagi manbalar/masterlar **majburiy**.

### 3.1 Hujjatlar ro'yxati

| Hujjat nomi | Turi | Tavsif |
| --- | --- | --- |
| Xodimlar ro'yxati_20260608 | Excel | Xodim raqami, ism, bo'lim, email manzilni belgilaydi. |
| J-4-1 Ichki safar yo'l xarajatlari nizomi | Word | Safar nizomi, kunlik nafaqa, turish yordami, yo'l nafaqasi, turar joy limiti, 50km/100km baholash, ish vaqtidan tashqari harakat va h.k. ni belgilaydi. |
| Mijozlar ro'yxati_20260608 | Excel | Mijoz nomi, tashrif joyi, filial nomi, manzil, masofa baholash, nom farqlarini belgilaydi. |
| 20-davr baholovchi/tasdiqlovchi ro'yxati_20260401 | Excel | Birinchi tasdiqlovchi, ikkinchi tasdiqlovchi, vakil tasdiqlovchi, tasdiqlanadigan bo'limni belgilaydi. |
| Safar tekshiruv varog'i shabloni namunasi | Excel | Birinchi tasdiqlash / ikkinchi tasdiqlash / farqlar ro'yxati / qaytarish matni nomzodining chiqish shakli. |
| Davomat jurnali_kunlik tafsilot_20260528160105 / Safar hisob-kitobi_20260601_165349 | Excel / CSV | Dizayn/test uchun o'tgan haftalik va 1 oylik ma'lumot. Normal va anomal pattern bo'lgan tekshiruv ma'lumoti. |

### 3.2 Maqsadi (har bir hujjat uchun)

- **Xodimlar ro'yxati_20260608** → xodim raqami/ism/bo'lim/tasdiqlovchini moslashtirish, email manzilini aniqlash.
- **J-4-1 Ichki safar nizomi** → qoida baholash, to'lash mumkinligini, tekshirish kerakligini, NG shartni, qaytarish matni nomzodini mashina baholay oladigan shaklga keltirish.
- **Mijozlar ro'yxati_20260608** → tashrif joyi nomidagi farqlar, masofa sharti, ish yo'lidan tashqari ekanligi, Salesforce mijoz nomi bilan solishtirish.
- **20-davr tasdiqlovchi ro'yxati_20260401** → kim birinchi/ikkinchi tasdiqlashi kerakligi, vakil tasdiqlashning to'g'riligini tekshirish.
- **Davomat jurnali & Safar hisob-kitobi ma'lumoti** → tasdiqlovchi ko'rishi kerak bo'lgan punktlar, tafsilot ekraniga o'tish kerak bo'lgan punktlar, qaytarish matnini standartlashtirish.

### 3.3 Solishtirish mantig'i (Matching Logic)

- Solishtirish kaliti asosan **"Xodim raqami" asosiy kalit (primary key)** bo'ladi. Hujjat raqami va sana yordamchi kalit (supplementary key).
- Faqat ism bilan solishtirish nom farqlari va bir xil ism xavfi tufayli, xodim raqami olinmagan holatda yordamchi sifatida ishlatiladi.
- Xodim raqami olinmasligi mumkinligi sababli, ismdan foydalanib solishtirish ham amalga oshiriladi. Solishtirib bo'lmaganlar — bir tomon ma'lumotidagi yozuv xato bo'lgani uchun, xodim nomini tuzatib qayta solishtiriladi.

| Solishtirish maqsadi | Asosiy kalit | Yordamchi kalit / maydon | Yo'q / ko'p moslik qoidasi |
| --- | --- | --- | --- |
| 楽々勤怠 → 楽々精算 | Xodim raqami + safar/ish kuni | Harakat boshlanishi-tugashi, ish boshlanishi-tugashi, davomat turi | Davomat kiritilmagan yoki sana mos kelmasa = "solishtirilmagan". Bir kunda bir nechta davomat nomzodi bo'lsa = "ko'p nomzod". |
| Kvitansiya / ilova → 楽々精算 | Ariza raqami + tafsilot raqami + ilova ID | Kvitansiya bor-yo'qligi, summa, operatsiya sanasi, kontragent nomi, soliq (turar joy/hammom solig'i) | Phase1 da ilova bor-yo'qligi, summa mosligi, soliq summasini markazda baholash. OCR keyingi bosqichda. |
| Qoida masteri → 楽々精算 | Safar turi + masofa sharti + tunash bor-yo'qligi + kunlar | Kunlik nafaqa, turish yordami, yo'l nafaqasi, turar joy limiti, ovqat yordami | Shartga mos kelmasa = "tekshirish kerak" yoki "NG". Qoida istisnosi — odam baholay olishi uchun sababni chiqarish. |
| Tasdiqlash marshruti → 楽々精算 | Bo'lim + ariza beruvchi + tasdiqlovchi | Birinchi tasdiqlovchi, ikkinchi tasdiqlovchi, vakil tasdiqlovchi | Ko'zda tutilgan marshrutdan tashqari bo'lsa = "tasdiqlash marshrutini tekshirish kerak". Vakil tasdiqlashning ruxsat shartini masterda aniq ko'rsatish. |
| 楽々精算 ichida takror tekshirish | Xodim raqami + safar kuni + tashrif joyi + summa | Ariza raqami, hujjat raqami, tafsilot raqami | Bir xil shartda bir nechta ariza bo'lsa = "ikki marta ariza shubhasi". Biri bekor/qaytarilgan bo'lsa istisno shartini belgilash. |

### 3.4 Tekshirish qoidalari (Validation Rules)

| Kategoriya | Maydonlar | Tekshirish qoidasi | Baho |
| --- | --- | --- | --- |
| Safar fakti | Safar muddati, manzil, maqsad | **OK**: shu kun davomati kiritilgan/tasdiqlangan, ishga kelgan deb tasdiqlanadi / **Diqqat**: davomat kiritilgan lekin tasdiqlanmagan/qisman yo'q (belgi tushib qolgan) — ishga kelgani aniq emas / **NG**: davomat yo'q, ishga kelmagan/to'liq ta'tilda — ishga kelgani tasdiqlanmaydi (hisob-kitob asosi yo'qoladi) | OK / Tekshirish / Solishtirilmagan |
| Mehnat / sog'liq boshqaruvi | Harakat boshlanishi/tugashi, ish boshlanishi/tugashi, tungi/dam olish/uzoq, ketma-ket safar | **OK**: jo'nash va qaytishda davomat va hisob-kitob mos / **Diqqat**: farq bor lekin kichik (masalan bir necha o'n daqiqa, kiritish xatosi ehtimoli yuqori, izohda sabab aniq) yoki tuzatish so'rovi bilan moslashtirsa bo'ladi / **NG**: farq katta, bir nechta joyda ziddiyat, sabab noma'lum/g'ayritabiiy, davomat yo'qligi sababli solishtirib bo'lmaydi | OK / Diqqat / Tekshirish |
| Safar xarajati / turar joy limiti | Yo'l haqi, turar joy, kunlik nafaqa, turish yordami, ovqat yordami, nafaqa jami, tunash soni | **OK**: qoida limit/shartiga sig'adi (turkum/daraja ham to'g'ri) / **Diqqat**: limitdan oshish ehtimoli bor lekin istisno qoidasi ob'ekti, asos (sabab/tasdiq) ilova/yozilgan, yoki baholashga zarur ma'lumot (turkum, kecha, joy) yetishmaydi, tekshirish kutilmoqda / **NG**: limitdan oshish aniq, istisno asosi (sabab/tasdiq) yo'q, qoida bo'yicha ruxsat etilmaydigan xarajat | OK / Tekshirish / NG |
| Ikki marta ariza / ortiqcha to'lov | Xodim raqami, safar kuni, tashrif joyi, summa, ariza raqami, minus hisob-kitob | **OK**: takror topilmadi / **Diqqat**: o'xshash ariza bor (bir kun/bir summa/bir yo'nalish) → farqni tushuntirish kerak / **NG**: bir xil kvitansiya/bir xil xarajat takrori aniqlandi (ortiqcha to'lov xavfi aniq) | OK / Tekshirish / NG |
| Dalil / kvitansiya | Kvitansiya ilovasi, bor-yo'qligi, operatsiya sanasi, kontragent nomi, summa, turar joy/hammom solig'i | **OK**: kvitansiya va ariza mazmuni mos (soliq ham ziddiyatsiz) / **Diqqat**: kichik nomuvofiqlik yoki tekshiruv yetishmasligi (nom farqi, soliq tarkibi noma'lum, kvitansiya noaniq) / **NG**: summa mos emas, turar joy mos emas, soliq ikki marta sanalgan, kvitansiyadan farqli mazmun — nomuvofiqlik aniq | OK / Tekshirish / NG |
| Tasdiqlash marshruti | Bo'lim, tasdiqlovchi, vakil tasdiqlovchi, tasdiqlash holati | Asl tasdiqlovchi tekshirishi kerak bo'lgan ariza ekanligini, vakil tasdiqlash shartini qanoatlantirishini tekshirish | OK / Tekshirish |

> ※ "Kichik / katta" chegarasi (masalan 30 daq, 60 daq, 90 daq) kompaniya bo'yicha aniq belgilangani yaxshi — tebranishni kamaytiradi. Kerak bo'lsa chegara taklifi ham tayyorlanadi.

### 3.5 Tekshiruvdan keyingi kutilgan natija

- 楽々精算 ning har bir tasdiqlanmagan arizasi uchun **davomat, qoida, kvitansiya, takror baholash natijasi 1 qatorda** ko'rinadi.
- Birinchi tasdiqlovchi uchun: tasdiqlash uchun zarur asosiy nuqtalargina ko'rsatiladi. Tekshirish/NG punktlari **qizil yoki ajratib** ko'rsatiladi (rasm①).
- Ikkinchi tasdiqlovchi uchun: kvitansiya, jadval, summa, qoida limiti, qaytarish tarixi kabi tafsilot punktlari ko'rsatiladi (rasm②③).
- Farq chiqsa: baho sababi, tekshirilishi kerak bo'lgan ekran, qaytarish matni nomzodi chiqariladi.
- Solishtirilmagan / ko'p nomzodlar **o'chirilmaydi**, tasdiqlovchi baholay olishi uchun qoldiriladi.

> `[Rasm①②③: chiqish tasviri namunasi — docx ichiga joylangan rasm. Matnga ajratib bo'lmaydi, asl docx ga qarang]`

### 3.6 Misol (Avval / Keyin)

**Avval:** har bir tizim ma'lumoti alohida, tasdiqlovchi bir nechta ekran ochib tekshiradi.

| Ma'lumot | Maydonlar | Holat |
| --- | --- | --- |
| 楽々精算 | Xodim raqami=100123, safar kuni=2026/05/20, tashrif joyi=A kompaniya, summa=18,000 yen | Tasdiqlanmagan ariza bor |
| 楽々勤怠 | Xodim raqami=100123, ish kuni=2026/05/20, ish tugashi=20:00 | Davomat kiritilgan |

**Keyin:** tekshiruv varog'iga birlashtirib, tasdiqlash uchun zarur baho natijasini ko'rsatadi.

| Ariza raqami | Xodim | Safar muddati | Davomat | Summa | Kvitansiya | Umumiy | Qaytarish nomzodi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TR-2026-0001 | 100123 Yamada Taro | 2026/05/20 | OK | OK | OK | Tasdiqlasa bo'ladi | - |
| TR-2026-0002 | 100456 Suzuki Hanako | 2026/05/21 | Solishtirilmagan | Tekshirish | Ilova yo'q | Tekshirish | Davomat kiritish va kvitansiya ilovasini tekshirishni so'rash |

---

## 4. Ma'lum ma'lumot muammolari (Known Data Issues)

1. Tizim bo'yicha ustun nomi, sana formati, vaqt formati har xil bo'lishi mumkin. Masalan: `2026/05/20`, `2026-05-20`, `5/20`, faqat vaqt va h.k.
2. 楽々勤怠 ning xodim raqami **rasmiy xodim raqami va tool raqami — 2 xil** ishlatilmoqda. Iyuldan keyin barcha xodimlarga rasmiy raqamga o'tkaziladi, lekin hozir faqat bir necha kishi rasmiy raqamdan foydalanmoqda.
3. Bir xodim bir kunda bir nechta safar/tashqi ish/ish qilsa, xodim raqami × sana bilangina aniq solishtirib bo'lmaydi.
4. Tashrif joyi/kontragent nomida yozuv farqlari bor. Masalan: `A kompaniya`, `A AJ`, `A kompaniya Tokio bo'limi`.
5. Kvitansiya ilovasi rasm/PDF/bir nechta varaq kabi formatlarda. OCR boshlang'ich doiradan tashqarida, ilova bor-yo'qligi va summa tekshiruvi ustuvor.
6. Davomatni safarchilar to'plab kiritishi mumkin, davomat kiritilmagan/keyin tuzatilgan/vakil kiritgan holatlarni aniq belgilash kerak.
7. Qoida baholashda 50km/100km sharti, ish yo'lidan tashqari, ish vaqtidan tashqari harakat, yo'l nafaqasi, ovqat yordami, turar joy/hammom solig'i kabi mayda shartlar bor.

---

## 5. Zarur qayta ishlash bosqichlari (Required Processing Steps)

> Boshlang'ich qurish — tekshiruv varog'i yaratish birinchi harakat. Phase1 da "avtomatik baho natijasini tasdiqlovchi ko'z bilan tekshirib, kerak bo'lsa qo'lda qaytarish ko'rsatmasi beradigan" holat yaratiladi.

| Bosqich | Harakat | Tafsilot |
| --- | --- | --- |
| Step 0 | Shart tekshirish | Davr, bo'lim, ariza, olinadigan ma'lumot, mas'ul shaxs, saqlash papkasi, fayl nomlash qoidasini belgilash. |
| Step 1 | Baholash qoidasini belgilash | Birinchi/ikkinchi tasdiqlovchining tekshiruv nuqtasi, qoida sharti, OK/Diqqat/Tekshirish/NG, qaytarish matni nomzodini masterga aylantirish. |
| Step 2 | Ma'lumot olish/joylash | 楽々精算, 楽々勤怠, Salesforce, masterlarni belgilangan papkaga joylash. Dastlab qo'lda yuklash, keyin RPA. |
| Step 3 | Ma'lumot o'qish/standartlash | Ustun nomi, sana, vaqt, xodim raqami, summa, tashrif joyi nomini standartlash. Zarur ustun/fayl yetishmasligini import logiga chiqarish. |
| Step 4 | Moslashtirish/solishtirish | Xodim raqami × sana asosiy kalit qilib 楽々精算/davomat/Salesforce ni solishtirish. Tashrif joyi, WO, ariza raqami yordamchi kalit. |
| Step 5 | Baholash | Safar fakti, mehnat/sog'liq, summa qoidasi, ikki marta ariza, kvitansiya, tasdiqlash marshrutini baholab, baho sababini biriktirish. |
| Step 6 | Tekshiruv varog'i yaratish | Birinchi tasdiqlash, ikkinchi tasdiqlash tafsiloti, farqlar ro'yxati, qaytarish matni nomzodi, import logini bitta Excel ga chiqarish. |
| Step 7 | Tasdiqlovchi ko'rib chiqishi | Tasdiqlovchi ko'z bilan tekshiradi. OK = tasdiqlash, Tekshirish/NG = shaxsga email yoki to'g'ridan-to'g'ri qaytarish ko'rsatmasi. |
| Step 8 | Tuzatishdan keyin qayta tekshirish | Tuzatilgan arizani qayta tekshiruv varog'iga olib, farq hal bo'lganini tekshirish. |
| Step 9 | Avtomatlashtirishni kengaytirish | Phase2 da qaytarish emailini tugma bilan yuborish, Phase3 da tekshiruvdan qaytarishgacha avtomatlashtirishni ko'rib chiqish. |

### 5.1 Dizayn / Test ish taqsimoti

| Bosqich | Vazifa | Tafsilot |
| --- | --- | --- |
| Dizayn: 1-hafta | Ma'lumot chiqish punktini tekshirish | 楽々精算/davomat/Salesforce dan zarur ustun chiqishini tekshirib, yetishmaganlarini aniqlash. |
| Dizayn: 1-hafta | Solishtirish kaliti/mapping jadvali yaratish | Xodim raqami, sana, ariza raqami, WO raqami, tashrif joyi kaliti va ustun nomi o'zgartirish jadvalini yaratish. |
| Dizayn: 2-hafta | Baholash qoidasi/istisno shartini belgilash | Qoida sharti, tasdiqlovchi ko'z bilan tekshirish nuqtasi, qaytarish sharti, solishtirilmagan/ko'p nomzod muomalasini yakunlash. |
| Dizayn: 2-hafta | Chiqish maketi dizayni | Birinchi/ikkinchi tasdiqlovchi uchun, farqlar ro'yxati, log ustunlari, tartibi, ajratib ko'rsatishni belgilash. |
| Test: 1-hafta | Modul test (unit) | Fayl o'qish, ustun nomi o'zgartirish, sana o'zgartirish, xodim raqami solishtirish, baho qoidasi birligini tekshirish. |
| Test: 1-hafta | Pattern test | Normal, davomat yo'q, Salesforce solishtirilmagan, kvitansiya yo'q, turar joy oshib ketishi, ikki marta ariza, oy oshib ketishi va h.k. ni tekshirish. |
| Test: 2-hafta | Tasdiqlovchi ko'rib chiqishi | Haqiqiy/namuna ma'lumot bilan tasdiqlovchi ko'rib baholay olishini tekshirish, keraksiz/yetishmagan ustunni tuzatish. |
| Test: 2-hafta | Operatsion test | Haftalik yuklash, papkaga joylash, tekshiruv varog'i yaratish, qaytarish, qayta tekshirishgacha bo'lgan oqimni tekshirish. |

---

## 6. Chiqish talablari (Output Requirements)

| Element | Mazmuni |
| --- | --- |
| **Chiqish fayli** | `出張精算_承認チェックシート_YYYYMMDD.xlsx` (Safar hisob-kitobi_tasdiqlash tekshiruv varog'i_YYYYMMDD) |
| **Format** | Excel (dastlab makroli `.xlsm` ham mumkin. Python bo'lsa `.xlsx` chiqarish) |
| **Chiqish birligi** | Haftalik yoki tasdiqlash davri bo'yicha. O'tgan hafta, 1 oy kabi bir necha pattern bilan tekshirish. |
| **Saqlash joyi** | Belgilangan papka. Fayl nomida davr, yaratilgan vaqt, versiya raqami bo'lsin. |

**Varaqlar (Sheet) tuzilmasi:**

| Sheet | Asosiy foydalanuvchi | Mazmuni |
| --- | --- | --- |
| 01_Birinchi tasdiqlash tekshiruvi | Birinchi tasdiqlovchi | Ariza beruvchi 1 kishi 1 qator asosida umumiy baho, tekshirish punkti, qaytarish nomzodini ko'rsatadi. Tasdiqlovchi birinchi ko'radigan varaq. |
| 02_Ikkinchi tasdiqlash tafsiloti | Ikkinchi tasdiqlovchi / Boshqaruv bo'limi | Kvitansiya, summa, turar joy, kunlik nafaqa, jadval, Salesforce solishtirish, qoida bahosi tafsilotini ko'rsatadi. |
| 03_Farqlar ro'yxati | Tasdiqlovchi | Faqat tekshirish/NG/solishtirilmagan/ko'p nomzodlarni ajratib, sabab, tekshirish manbasi, javob taklifini ko'rsatadi. |
| 04_Qaytarish matni nomzodi | Tasdiqlovchi | Shaxsga yuboriladigan email/izoh matni nomzodini ariza/sabab birligi bo'yicha yaratadi. |
| 05_Import logi | FPT / Operatsiya mas'uli | Import vaqti, fayl nomi, soni, zarur ustun yetishmasligi, xato, qayta ishlash natijasini yozadi. |
| 06_Baholash qoidasi | FPT / Biznes mas'uli | Ishlatilgan qoida, chegara, baho turi, o'zgartirish sanasini saqlaydi. |
| 07_Master tekshiruvi | FPT / Boshqaruv bo'limi | Xodimlar masteri, tasdiqlash marshruti, tashrif joyi masterining ro'yxatdan o'tmagan/takror/nomuvofiqligini ko'rsatadi. |

> Eslatma: skript bilan olsa bo'ladi.

### 6.1 Ko'rsatish qoidalari (Display Rules)

- OK normal ko'rinish, Diqqat/Tekshirish **sariq** rangda. NG/ko'p nomzod **qizil** rangda ajratib ko'rsatiladi.
- Tasdiqlovchi tafsilot tekshirishi kerak bo'lgan punktda tekshirish manbasi va nuqtasini ko'rsatish. Masalan: "楽々勤怠 ning ish tugashi vaqtini tekshiring".
- Kelajakda tafsilot ekraniga o'tish tugmasi qo'yilsa, 楽々精算/楽々勤怠 yoki ariza ID ni ustun sifatida saqlash.
- Tekshirish/NG ga baho sababi va qaytarish matni nomzodini **albatta chiqarish**.

---

## 7. Qabul mezonlari (Acceptance Criteria)

| № | Qabul mezoni | Tekshirish usuli |
| --- | --- | --- |
| 1 | Belgilangan papkadagi 楽々精算/楽々勤怠/masterlarni o'qib, bitta tekshiruv varog'ini avtomatik yaratadi. | Namuna ma'lumot bilan ishga tushirib, chiqish fayli yaratilganini tekshirish. |
| 2 | 楽々精算 ning tasdiqlanmagan ariza soni va birinchi tasdiqlash varog'idagi ariza soni mos keladi. | Kirish va chiqish sonini import logida solishtirish. |
| 3 | Xodim raqamini asosiy kalit qilib 楽々精算 va davomat solishtirish natijasi chiqadi. ※ Dastlab ism solishtirish kaliti. | Normal/solishtirilmagan/ko'p nomzod test ma'lumotida tekshirish. |
| 4 | Kunlik nafaqa, turish yordami, yo'l nafaqasi, tunash soni, turar joy limiti, kvitansiya ilovasi, ikki marta ariza va h.k. bahosi chiqadi. | Baho qoidasi bo'yicha pattern testida tekshirish. |
| 5 | Tekshirish/NG arizalariga baho sababi va qaytarish matni nomzodi chiqadi. | Farqlar ro'yxati / qaytarish matni varag'ida tekshirish. |
| 6 | Tasdiqlovchi faqat birinchi tasdiqlash varog'i bilan "tasdiqlasa bo'ladi/tekshirish/qaytarish" birinchi bahosini bera oladi. | Birinchi tasdiqlovchi ko'rib chiqishida tekshirish. |
| 7 | Ishga tushirish xatosi, zarur ustun yetishmasligi, master ro'yxatdan o'tmaganligi import logi yoki master tekshiruv varag'ida qoladi. | Ataylab yetishmaydigan ma'lumot bilan xato boshqaruvini tekshirish. |
| 8 | Asl ma'lumot o'zgartirilmaydi. Natija alohida fayl sifatida chiqariladi. | Qayta ishlashdan keyin kirish faylining yangilanish vaqti/mazmunini tekshirish. |

---

## 8. Misol (Avval / Keyin)

**Avval:** tasdiqlovchi alohida tekshiradigan holat

| Maqsad | Hozirgi tekshiruv | Muammo |
| --- | --- | --- |
| 楽々精算 | Safar muddati, tashrif joyi, maqsad, yo'l haqi, turar joy, kunlik nafaqa, kvitansiyani tekshirish | Har bir arizani alohida ochish kerak, tekshiruv nuqtasi odamga bog'liq. |
| 楽々勤怠 | Ish boshlanishi-tugashi, safar kuni, dam olish/tungi/uzoq vaqtni tekshirish | 楽々精算 bilan 2 ekranda solishtirgani uchun vaqt ketadi. |
| Qaytarish | Email yoki to'g'ridan-to'g'ri shaxsga tuzatish ko'rsatmasi | Ko'rsatma mazmuni/matni har xil. Tarix qolmaydi. |

**Keyin:** avtomatik yaratilgan tekshiruv varog'i bilan baholaydigan holat

| Ariza raqami | Ariza beruvchi | Safar mazmuni | Mehnat | Summa | Dalil | Umumiy | Harakat |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TR-001 | Yamada Taro | Solishtirish OK | Davomat OK | Turar joy OK | Kvitansiya OK | Tasdiqlasa bo'ladi | Tasdiqlash |
| TR-002 | Suzuki Hanako | Solishtirish OK | Davomat yo'q | Kunlik nafaqa tekshirish | Kvitansiya yo'q | Tekshirish | Shaxsga qaytarish |
| TR-003 | Sato Ichiro | Solishtirilmagan | Uzoq harakat diqqat | Turar joy oshib ketgan | Kvitansiya OK | NG nomzodi | Tafsilot tekshirgach qaytarish |

---

## 9. Biznes mantig'i izohlari (Business Logic Notes)

### 9.1 Baho ta'riflari (Judgement Definitions)

| Baho | Ma'nosi | Harakat |
| --- | --- | --- |
| OK | Qoida bo'yicha muammo yo'q, yoki solishtirishda farq yo'q. | Asosan tasdiqlasa bo'ladi. |
| Tekshirish (要確認) | Tasdiqlashdan oldin tekshirish kerak. Masalan: davomat yo'q, summa limitga yaqin, izoh yetishmaydi. | Shaxs yoki tegishli kishidan so'rash. |
| NG | Qoida buzilishi yoki dalil yetishmasligi ehtimoli yuqori, shu holatda tasdiqlamaslik kerak. | Qaytarish, tuzatish so'rovi. |
| Solishtirilmagan (未突合) | Zarur qarama-qarshi ma'lumot topilmagan holat. | Ma'lumot olinmagan/kiritish tushib qolgan/kalit mos kelmasligini tekshirish. |

### 9.2 Bosqich yondashuvi (Phase Approach)

| Bosqich | Avtomatlashtirish darajasi | Operatsiya |
| --- | --- | --- |
| Phase1 | Tekshiruv varog'i avtomatik yaratish + odam bahosi | Ma'lumotni qo'lda yuklab, Excel/VBA yoki Python bilan tekshiruv varog'i yaratish. Farq ko'rsatilgach, tasdiqlovchi ko'z bilan tekshiradi, email yoki to'g'ridan-to'g'ri qaytarish. Tekshiruv varog'ida tasdiqlash/qaytarishni 楽々精算 ga aks ettirish. |
| Phase2 | Qaytarish xabarini qisman avtomatlash | Power Automate va h.k. bilan tekshirish/NG mazmunini bitta tugma bilan shaxsga email yuborish. RPA bilan yuklash/joylash/email yuborishga yordam ko'rib chiqish. |
| Phase3 | Tekshiruvdan qaytarishgacha avtomatlash | Baho natijasiga ko'ra qaytarish ob'ektini avtomatik xabar berish. Tasdiqlashni to'liq avtomatlash emas, tasdiqlovchining yakuniy bahosini qoldirish. |

### 9.3 Rol taqsimoti (Role Split)

- **Birinchi tasdiqlovchi**: safar fakti, mehnat/sog'liq boshqaruvi, manzil/maqsad, davomat bilan moslik, shaxsga qaytarishni asosan tekshiradi.
- **Ikkinchi tasdiqlovchi / Boshqaruv bo'limi**: kvitansiya, summa, qoida, turar joy limiti, soliq/nafaqa, ortiqcha to'lov/ikki marta arizani asosan tekshiradi.
- **FPT**: ma'lumot tuzilmasini tekshirish, baho qoidasi belgilashga yordam, tekshiruv varog'i dizayni, VBA/Python/RPA/Power Automate ishlab chiqish va testlash.
- **Biznes mas'uli**: qoida talqini, tasdiqlovchining baho doirasi, tekshirish/NG sharti, istisno tasdiq operatsiyasini belgilash.

---

## 10. Cheklovlar (Constraints)

1. **Power Query boshlang'ich amalga oshirishda asos qilinmaydi.** Excel VBA, Python, RPA, Power Automate markazda ko'rib chiqiladi.
2. Boshlang'ich bosqichda tizimdan avtomatik yuklash, API ulanish, avtomatik tasdiqlash qilinmaydi. Qo'lda yuklangan faylni belgilangan papkaga qo'yish usuli asos.
3. **Asl ma'lumot o'zgartirilmaydi.** Tekshiruv natijasi alohida fayl sifatida chiqariladi.
4. Solishtirilmagan/ko'p nomzod/istisno shartlari o'chirilmaydi, tasdiqlovchi baholay oladigan holatda chiqariladi.
5. 楽々勤怠 ni to'liq avtomatlash qiyin bo'lishi mumkin, shuning uchun davomat yo'q/tuzatish tushib qolishi shaxs tekshiruvi yoki qo'lda qaytarish bilan qoldiriladi.
6. Kvitansiya OCR boshlang'ich doiradan tashqarida. Phase1 da ilova bor-yo'qligi, summa, operatsiya sanasini tekshirish markazda.
7. Shaxsiy ma'lumot, ish ma'lumoti, hisob-kitob ma'lumotini ishlatgani uchun kirish huquqi, saqlash joyi, fayl ulashish doirasi, log boshqaruvini oldindan belgilash.
8. Tekshiruv natijasi tasdiqlash bahosiga yordam beruvchi, yakuniy tasdiqlash/qaytarish bahosini tasdiqlovchi beradi.

---

## 11. Topshirish formati (Delivery Format)

| Topshiriladigan | Format | Tavsif |
| --- | --- | --- |
| Vazifa spetsifikatsiyasi | Word / DOCX | Ushbu hujjat. Biznes talabi, kirish, solishtirish, baho, chiqish, cheklovni belgilaydi. |
| Punkt mapping jadvali | Excel | Har bir tizim chiqish ustuni va standart punkt nomi mosligi jadvali. |
| Baholash qoidalari masteri | Excel | Qoida/tasdiqlash nuqtasi/qaytarish matni/baho turi masteri. |
| Tekshiruv varog'i shabloni | Excel | Birinchi/ikkinchi tasdiqlash/farqlar ro'yxati/log chiqish shakli. |
| Amalga oshirish fayllari | Excel VBA / Python / RPA / Power Automate | Tekshiruv varog'i yaratish, qaytarish matni yaratish, kelajakda email yuborish/yuklash avtomatlash. |
| Test natija hisoboti | Excel / Word | Normal/anomal/pattern test/tasdiqlovchi ko'rib chiqish natijasi. |
| Operatsiya qo'llanmasi | Word / PowerPoint | Haftalik yuklash, papkaga joylash, ishga tushirish, tekshirish, qaytarish, qayta tekshirish tartibi. |

---

## Ilova A. Ishni boshlashdan oldin mijoz bilan kelishilishi kerak bo'lgan masalalar

| Masala | Kerak qaror | Aniq bo'lmasa xavf |
| --- | --- | --- |
| Ma'lumot olish imkoniyati | 楽々精算/davomat/Salesforce dan zarur punktni chiqarsa bo'ladimi. Kim, qachon, qaysi birlikda yuklaydi. | Zarur punkt yetishmay, solishtirish/baho bo'lmaydi. Dizayndan keyin qayta ishlash kerak bo'ladi. |
| Solishtirish kaliti | Xodim raqami, sana, ariza raqami, WO raqami, tashrif joyidan qaysi biri asosiy/yordamchi kalit. | Solishtirilmagan/xato solishtirish ko'payadi, tasdiqlovchi ishonmaydigan varaq bo'ladi. |
| Baholash qoidasi | OK/Diqqat/Tekshirish/NG chegarasi, qoida istisnosi, tasdiqlovchi ko'rish doirasi, qaytarish shartini belgilash. | Avtomatik baho natijasi biznes bahosiga mos kelmay, oxiri qo'lda ishga qaytadi. |
| Operatsiya doirasi | Birinchi/ikkinchi tasdiqlovchidan qaysi biri maqsad, qayergacha avtomatlash. | Kutilma siljiydi, boshlang'ich 1 oyda tugamaslik xavfi oshadi. |
| Qaytarish operatsiyasi | Qo'lda email, to'g'ridan-to'g'ri ko'rsatma, Power Automate email, 楽々精算 ichida qaytarishdan qaysi biri. | Tekshiruvdan keyingi harakat noaniq bo'ladi, samara chiqmaydi. |
| Test ma'lumoti | O'tgan hafta, 1 oy, normal/anomal pattern, oy oshib ketishi, ikki marta ariza, kvitansiya yo'q va h.k. tayyorlash. | Istisno patternni tekshirib bo'lmaydi, real ishda baho tushib qoladi. |
| Log boshqaruvi | Import logi, baho logi, qaytarish logi, qayta tekshirish logini qayergacha qoldirish. | Keyin baho asosini kuzatib bo'lmaydi, audit/yaxshilashga ishlatib bo'lmaydi. |

---

## Ilova B. Birinchi harakat (First Action)

Birinchi boshlanadigan ish — **tekshiruv varog'ini yaratish**. Birdaniga to'liq avtomatlashga intilmasdan, aysbergning ko'ringan uchi sifatida tasdiqlash tekshiruv ishini aniqlashtirib, ishlatgan holda yetishmagan ma'lumot/aniqlanmagan qoida/istisno ishlovini aniqlash.

1. 楽々精算 tasdiqlanmagan ro'yxat, 楽々勤怠 namuna ma'lumotini 1 hafta va 1 oylik olish. (qancha kerak?)
2. Birinchi/ikkinchi tasdiqlovchi hozir ko'rayotgan tekshiruv nuqtalarini tekshiruv punkti sifatida ro'yxatga olish.
3. Xodim raqamini asosiy kalit qilib, solishtirsa bo'ladigan/bo'lmaydigan punktni tekshirish. Kerak bo'lsa yordamchi kalit qo'yish.
4. OK/Diqqat/Tekshirish/NG vaqtinchalik baho qoidasini belgilab, tekshiruv varog'ini sinov yaratish.
5. Tasdiqlovchiga sinov versiyasini ko'rsatib, "shu bilan samara chiqadimi", "baholashga yetishmaydigan punkt nima" ni tekshirish.
6. Yetishmagan ma'lumot, qo'shimcha qoida, istisno shartini aks ettirib, Phase1 operatsiyasiga kirish.
