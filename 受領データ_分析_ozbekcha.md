# Yapon hamkasblar bergan fayllar — to'liq analiz (o'zbekcha)

Sana: 2026-06-15. 2 ta papka, jami **9 fayl**. Quyida har birining mazmuni, tuzilmasi, muammolari.

---

## Umumiy xulosa (eng muhimi)

| # | Fayl | Turi | Holati | Mazmun |
| --- | --- | --- | --- | --- |
| 1 | DATA TASK SPECIFICATION GUIDELINE 1.docx | Word (EN) | ✅ o'qildi | Spec yozish shabloni (qoida) |
| 2 | EXAMPLE OF A COMPLETE TASK 1.docx | Word (EN) | ✅ o'qildi | To'ldirilgan spec namunasi |
| 3 | 20期評価者・承認者一覧_20260401.xlsx | Excel | ✅ o'qildi | Tasdiqlovchilar/baholovchilar ro'yxati (9 davr) |
| 4 | 出張精算_20260601_165349.csv | CSV (Shift-JIS) | ✅ o'qildi | Safar hisob-kitobi — **1 ariza, 7 qator** (kichik namuna) |
| 5 | 出張精算_20260602_085224.csv | CSV (Shift-JIS) | ✅ o'qildi | Safar hisob-kitobi — **75 ariza, 692 qator** (asosiy data) |
| 6 | 出勤簿_日別詳細_20260528160105.xlsx | Excel | ✅ o'qildi | Davomat — 52 xodim, 4 varaq, **eski ID format (139, 160…)** |
| 7 | 出勤簿_日別詳細_20260605120823.xlsx | Excel | ✅ o'qildi | Davomat — 35 xodim, 4 varaq, **aralash ID (AH000121 + 160…)** |
| 8 | 社員リスト_20260608.xlsx | Excel | ✅ ochildi (parol) | Xodimlar masteri — **53 xodim** |
| 9 | 顧客リスト_20260608.xlsx | Excel | ✅ ochildi (parol) | Mijozlar masteri — **271 mijoz + masofa** |

> ✅ **2 ta master fayl parol bilan shifrlangan edi, parol `peeg0608` bilan ochildi** (Microsoft StrongEncryption). Kodda ham `msoffcrypto-tool` + shu parol bilan deshifrlanadi.

---

## Papka 1: `OneDrive_1_2026-6-15` — Spec hujjatlari (2 ta Word)

### 1. DATA TASK SPECIFICATION GUIDELINE 1.docx
Spec qanday yozilishi kerakligini belgilovchi **shablon/qoida** (inglizcha). 11 majburiy bo'lim:
`1.Overview, 2.Input Data, 3.Reference/Matching Logic, 4.Known Data Issues, 5.Processing Steps, 6.Output, 7.Acceptance Criteria, 8.Before/After, 9.Business Logic, 10.Constraints, 11.Delivery Format` + pre-submission checklist.

➡️ Bu — sening oldingi `出張精算業務_DATA_TASK_SPECIFICATION` faylingni **shu shablon asosida** yozilgani. Aynan shu struktura.

### 2. EXAMPLE OF A COMPLETE TASK 1.docx
Shu shablon bo'yicha **to'ldirilgan namuna** — "Customer Transaction Data Cleaning and Validation" misoli. Python data-cleaning vazifasi qanday tasvirlanishini ko'rsatadi (input transactions.xlsx, master bilan solishtirish, duplikat/null tozalash, `.ipynb` + CSV chiqarish).

➡️ Maqsad: yapon tomon "vazifalarni shu formatda bering, biz shunday kutamiz" deb namuna bergan.

---

## Papka 2: `出張精算データ一式` — Haqiqiy ma'lumot

### 3. 20期評価者・承認者一覧_20260401.xlsx — Tasdiqlovchilar masteri
- **9 varaq**: `20期`(joriy), `19期`…`13期` (o'tgan davrlar/yillar). Faqat **20期** kerak.
- Tuzilma (20期, 64 qator): bo'lim, xodim ismi, va har xil tasdiqlash turlari bo'yicha tasdiqlovchilar:
  - **出張旅費関連 → 出張命令者** (safar buyrug'i beruvchi) ← bizga shu kerak
  - 勤怠管理 → 承認者 (davomat tasdiqlovchi)
  - 目標管理 / 行動考課 / 自己申告 → 1-/2-darajali baholovchi
- Misol qator: `事業推進PJ(001) | 土田 光樹 | 出張命令者=西 三照 | 勤怠承認者=西 三照`
- Bo'limlar kodi bilan: masalan `事業推進PJ (001)`.

➡️ **Foydasi**: kim kimning safarini tasdiqlashini aniqlash (spec 3.3 "承認ルート → 楽々精算" matching uchun).

### 4–5. 出張精算 CSV (2 ta) — Safar hisob-kitobi ma'lumoti (楽々精算)

Ikkalasi **bir xil tuzilma, 30 ustun, Shift-JIS**. Fayl 4 = kichik namuna (1 ariza), Fayl 5 = asosiy (75 ariza).

**Ustunlar (30):**
```
ヘッダ: 伝票No. | 出張申請伝票No.(申請No.) | 行数
明細: 明細No. | 明細日付 | 時刻(開始) | 時刻(終了) | 出発地 | 到着地 |
      交通機関 | 金額 | 証票(領収証) | 手当1CD(日当) | 手当2CD(宿泊料) |
      手当3CD(滞在費補助) | フリー1(備考) | 勘定科目名 | 小計
ヘッダ: 合計 | 入力者名 | 承認実行者1名 | 承認日1 | … 承認実行者5名 | 承認日5
```

**Asosiy CSV (Fayl 5) statistikasi:**
- **75 ariza (伝票)**, 692 qator (har ariza bir necha harakat bosqichi = qator).
- Sana oralig'i: **2026/05/08 – 2026/05/29** (taxminan 3 hafta).
- **39 xil xodim** (入力者名).
- Kvitansiya (証票): **159 ta "あり" (bor), 533 ta "なし" (yo'q)** → ~77% kvitansiyasiz (asosan transport).
- Tasdiqlovchilar (承認実行者1): 中田 雅史, 岡田 高明, 岡部 信一, 河本 実, 浜内 邦嘉, 清水 雄太, 田中 裕子, 福永 康平, 茅野 義洋, 西 三照, 高橋 昭太 (11 kishi).
- Tafsilot misoli: `MEBAS0018100 | 2026/05/20 | 大塚(東京)→いわき | 電車･ﾊﾞｽ | 3850円 | 入力者 松沢 響`.
- **手当 (nafaqa) kodlari**: 日当=`007`/`002`, ba'zi qatorlarda bor — kunlik nafaqa hisoblanadi.

➡️ Bu — tekshiriladigan asosiy obyekt. Har ariza (伝票) = bir xodimning bir safari, ichida bir necha harakat qatori.

> Eslatma: 入力者名 ustunida ba'zi qatorlarda **ism o'rniga raqam** chiqdi (masalan `14300`, `6991`) — bu xodim/tool raqami. Ya'ni CSVda ham ID/ism aralashligi bor.

### 6–7. 出勤簿_日別詳細 (2 ta) — Davomat ma'lumoti (楽々勤怠)

Ikkalasi **4 varaqdan**: `フレックス(一般職)`, `フレックス(管理職)`, `固定勤務(一般職)`, `固定勤務(派遣社員)`.

**Ustunlar (1-fayl 76 ta, 2-fayl 47 ta — formatlar farq qiladi!):**
```
社員番号 | 氏名 | 部門 | 役職 | 日付 | 曜日 | カレンダー | 申請内容 |
出勤時刻 | 退勤時刻 | テレワーク出勤/退勤時刻 | 計算開始/終了時刻 |
休憩時間 | 昼休み | 中断 | 移動開始/終了 | 深夜発着手当 |
平日勤務時間 | 残業 | 平日深夜 | 休出時間 …
```
- `カレンダー`: 平日/法定外(shanba)/法定内(yakshanba). `申請内容`: 有休(ta'til), テレワーク, va h.k.

**🔴 Eng muhim muammo — 社員番号 formati har xil:**
| Fayl | 社員番号 misol | Xodimlar soni | Format |
| --- | --- | --- | --- |
| 6 (0528) | `139`, `160`, `162`, `522380N6` | 52 | asosan **eski raqam / tool raqami** |
| 7 (0605) | `AH000121`, `AZ000123`, `160`, `128` | 35 | aralash — **yangi rasmiy (AH/AZ…) + eski raqam** |

➡️ Bu **spec dagi Known Issue #2 ni aniq tasdiqlaydi**: "社員番号 ikki xil (rasmiy + tool), iyuldan keyin birlashtiriladi, hozir faqat bir necha kishi rasmiy raqamda". Demak hozir davomat↔hisob-kitob solishtirishni **faqat xodim raqami bilan qila olmaymiz** — ism + bo'lim yordamchi kalit zarur, yoki 社員リスト master (lekin u shifrlangan).

> Davomatda 氏名 (ism) bor — masalan `土田 光樹`, `岩岬 一尋`. Bu CSV/承認者一覧 dagi ismlar bilan moslashtirish uchun ishlatiladi.

### 8. 社員リスト_20260608.xlsx — Xodimlar masteri ✅ (parol `peeg0608`)
- 1 varaq `Sheet1`, **53 xodim**, 5 ustun:
  `社員番号 | 氏名 | メールアドレス | 所属部署 | 所属管轄(東西)`
- Misol: `AA003550 | 土田 光樹 | mi.tsuchida@screen-peeg.co.jp | 事業推進PJ | 東`
- **社員番号 prefikslari**: `AZ`=36, `AH`=8, `AA`=7, `AC`=1, `52…`=1. → ya'ni **rasmiy ID = `AA/AH/AZ…` formatda** (`AH000121` kabi).
- Email domeni: `@screen-peeg.co.jp`.

➡️ **Bu fayl — eng muhim kalit.** Davomatdagi eski raqam (`139`,`160`) bilan rasmiy ID (`AH000121`) ni bog'lashga yordam beradi (氏名 orqali), email yuborish manzilini beradi.

### 9. 顧客リスト_20260608.xlsx — Mijozlar masteri ✅ (parol `peeg0608`)
- 1 varaq `顧客一覧PEEG(MEBA)`, **271 mijoz**, 5 ustun:
  `取引先名 | 取引先番号 | 距離区分 | 都道府県 | 東西`
- Misol: `リンクステック株式会社[下館工場] | MB.170002 | 50~100 km | 茨城県 | 東`
- **距離区分 (masofa) qiymatlari** (10 daraja): `0~50km`(77), `50~100km`(53), `100~150km`(36), `150~200km`(30), `200~250km`(23), `250~300km`(10), `300~350km`(7), `350~400km`(9), `400~500km`(5), `500~km`(21).
- 東西 (sharq/g'arb): 東=152, 西=119.

➡️ **Foydasi**: safar manzili (CSVdagi 到着地) ni mijoz nomiga moslash, va **距離区分 orqali 50km/100km qoidasini** (kunlik nafaqa/turar joy) avtomatik baholash. CSVdagi `リンクステック石岡` kabi joy nomini shu masterga moslash kerak (nom farqlari bor).

---

## Asosiy xulosalar / keyingi qadamlar

1. ✅ **Master fayllar ochildi** (parol `peeg0608`) — 社員リスト (53 xodim) + 顧客リスト (271 mijoz, masofa bilan). Endi solishtirish va masofa baholash quriladi.
2. **🔴 社員番号 nomuvofiqligi tasdiqlandi** — davomatning 2 faylida ID formati har xil (`139` vs `AH000121`). 社員リスト ham rasmiy `AA/AH/AZ` formatda. Eski raqam↔rasmiy ID ko'prigi yo'q → dastlab **ism (氏名)** kalitiga tayanish kerak (spec ham shuni aytadi).
3. **Data hajmi**: asosiy hisob-kitob CSV = 75 ariza / 3 hafta. Test/proto uchun yetarli. Kichik CSV = 1 arizalik namuna.
4. **承認者一覧**: faqat `20期` varag'i kerak, qolgan 8 ta tarixiy. `出張命令者` ustuni = safar tasdiqlovchi.
5. **Spec shabloni (Word 1–2)**: yapon tomon vazifani aynan shu 11-bo'limli formatda kutadi — sening spec'ing shunga mos.
6. **Encoding**: CSV = Shift-JIS (UTF-8 ga konvert kerak, kodda `encoding='shift_jis'`). Davomat xlsx ustunlari ikki faylda farq qiladi (76 vs 47) — kod ikkalasini ham qabul qila olishi kerak (mapping jadval).

---

### Texnik eslatma (kod yozganda)
- CSV o'qish: `pd.read_csv(..., encoding='shift_jis')` yoki `cp932`.
- 社員リスト/顧客リスト: `msoffcrypto-tool` + parol bilan deshifrlash kerak (parol qo'lga kelgach).
- Davomat: 2 fayl ustun soni har xil → ustun nomi bo'yicha mapping qiling, indeks bo'yicha emas.
- 伝票No (masalan `MEBAS0018100`) = arizaning unikal kaliti; 明細No = ariza ichidagi qator.
