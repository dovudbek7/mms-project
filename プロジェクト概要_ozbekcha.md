# Loyiha brifi — Xizmat safari tasdiqlash avtomatlash (o'zbekcha)

Mijoz: SCREEN-PEEG (yapon). Sana: 2026-06-16.
Bu fayl — **nima qilishimiz kerak, qaysi fayl nimaga, output nima kutilyapti** — bir joyda.

---

## 1. Vazifa nima (umumiy maqsad)

Kompaniya **xizmat safari xarajatlarini tasdiqlashni** yengillashtirmoqchi.

**Hozirgi muammo:** tasdiqlovchi har safar arizasini tasdiqlash uchun **2 tizimni alohida ekranda** ochib qo'lda solishtiradi:
- **楽々精算 (Rakuraku Seisan)** — xarajat tizimi: safar, manzil, pul, kvitansiya
- **楽々勤怠 (Rakuraku Kintai)** — davomat tizimi: o'sha kuni ishga kelganmi, ish vaqti

→ Sekin, odamga bog'liq, xato/tushib qolish ko'p, qaytarish ko'rsatmasi har xil.

**Biz quramiz:** ikki tizim datasini avtomatik solishtirib, **bitta Excel "tekshiruv varog'i"** chiqaradigan dastur (Python yoki Excel VBA). Tasdiqlovchi 1 qatorga qarab → **OK / tekshirish / qaytarish** deydi.

**Phase1 (hozirgi bosqich):** dastur faqat tekshiruv varog'ini yasaydi, **yakuniy qarorni odam beradi**. To'liq avtomat emas.

| Bosqich | Daraja |
|---|---|
| **Phase1** (hozir) | Tekshiruv varog'i avtomatik + odam baholaydi |
| Phase2 | Qaytarish xabarini tugma bilan email (Power Automate) |
| Phase3 | Qaytarishgacha avtomat (yakuniy qaror baribir odamda) |

---

## 2. Qaysi fayl nimaga kerak

### 🎯 Asosiy tekshiriladigan obyekt
| Fayl | Roli |
|---|---|
| **出張精算_20260602_085224.csv** (75 ariza, 692 qator) | Tekshiriladigan safar arizalari. Har qator = safarning bir harakati (manzil→manzil, transport, pul, kvitansiya, kim kiritgan, kim tasdiqlagan). 1 伝票No = 1 safar. |
| **出張精算_20260601_165349.csv** (1 ariza) | Kichik namuna, struktura testi uchun. |

### 🔗 Solishtirish uchun (davomat)
| Fayl | Roli |
|---|---|
| **出勤簿_日別詳細 ×2** (52 + 35 xodim, 4 varaq) | Safar kuni xodim ishga kelganmi, ish boshlanishi/tugashi. CSV bilan **ism/社員番号 + sana** bo'yicha solishtiriladi. 🔴 2 faylda ID formati har xil (`139` vs `AH000121`). |

### 🗝️ Masterlar (parol `peeg0608`)
| Fayl | Roli |
|---|---|
| **社員リスト_20260608.xlsx** (53 xodim) | Ism ↔ 社員番号 ↔ bo'lim ↔ email birlashtirish kaliti. Eski raqamni rasmiy ID ga bog'lash, qaytarish emaili manzili. |
| **顧客リスト_20260608.xlsx** (271 mijoz) | Safar manzilini mijozga moslash + **距離区分** (0~50km … 500~km, 10 daraja) orqali 50km/100km qoidasini avtomatik baholash. |
| **20期評価者・承認者一覧_20260401.xlsx** (`20期` varaq) | Kim kimning safarini tasdiqlashi to'g'rimi tekshirish (`出張命令者` ustuni). |

### ⚖️ Qoida (hali yetishmaydi)
| Fayl | Roli |
|---|---|
| **J-4-1 国内出張旅費規定 / 判定ルールマスタ** | Kunlik nafaqa, turar joy limiti, masofa sharti, soliq qoidalari. **❌ Bizda hali yo'q — yapon tomondan kelishi kerak.** Bularsiz pul/limit bahosini qura olmaymiz. |

### 📋 Format namunasi (ish jarayoni emas, qo'llanma)
| Fayl | Roli |
|---|---|
| **DATA TASK SPECIFICATION GUIDELINE 1.docx** | Vazifa qanday yozilishi kerakligi shabloni (11 bo'lim). |
| **EXAMPLE OF A COMPLETE TASK 1.docx** | To'ldirilgan namuna. Spec shunga mos yozilgan. |

---

## 3. Output — nima kutilyapti

**Fayl nomi:** `出張精算_承認チェックシート_YYYYMMDD.xlsx` — bitta Excel, **7 varaq**:

| Varaq | Kim uchun | Mazmun |
|---|---|---|
| `01_一次承認チェック` | 1-tasdiqlovchi | Har ariza 1 qator: umumiy baho + tekshirish punkti + qaytarish nomzodi. **Asosiy varaq.** |
| `02_二次承認詳細` | 2-tasdiqlovchi | Kvitansiya, pul, turar joy, kunlik nafaqa, jadval, qoida bahosi tafsiloti. |
| `03_差異一覧` | Tasdiqlovchi | Faqat muammolilar (要確認/NG/未突合) + sabab + qaysi ekranni tekshirish + javob taklifi. |
| `04_差戻し文面候補` | Tasdiqlovchi | Xodimga yuboriladigan qaytarish xabari matni (tayyor shablon). |
| `05_取込ログ` | Operatsiya / FPT | Import logi: nechta fayl, nechta qator, xato, yetishmagan ustun. |
| `06_判定ルール` | Biznes mas'uli | Ishlatilgan qoidalar, chegaralar, baho turi, sana. |
| `07_マスタ確認` | Boshqaruv | Masterdagi nomuvofiqlik (ro'yxatdan o'tmagan/takror xodim/mijoz). |

### Har ariza uchun dastur qo'yadigan baho
| Baho | Ma'no | Rang | Harakat |
|---|---|---|---|
| 🟢 **OK** | Muammo yo'q | normal | Tasdiqlasa bo'ladi |
| 🟡 **要確認** | Tekshirish kerak (davomat yo'q, pul limitga yaqin, kvitansiya yo'q) | sariq | Odam tekshiradi |
| 🔴 **NG** | Qoida buzilgan / ortiqcha to'lov / dalil yo'q | qizil | Qaytarish |
| ⚪ **未突合** | Qarama-qarshi data topilmadi (ID mos kelmadi) | — | Data/kalitni tekshirish |

### Tekshiriladigan 6 nuqta
1. **Safar fakti** — o'sha kun davomati bormi, ishga kelganmi
2. **Mehnat/sog'liq** — harakat vaqti vs ish vaqti mos kelishi, tungi/uzoq
3. **Pul/limit** — yo'l haqi, turar joy, kunlik nafaqa regulamentga mos
4. **Ikki marta ariza** — bir xil safar/summa takror berilmaganmi
5. **Kvitansiya** — ilova bor-yo'qligi, summa mosligi
6. **Tasdiqlash marshruti** — to'g'ri tasdiqlovchi qarayaptimi

### Qat'iy talablar (Constraints)
- Asl data **o'zgartirilmaydi** — natija alohida faylga.
- 未突合 / istisno **o'chirilmaydi** — odam ko'rishi uchun qoladi.
- Phase1: API/avto-DL/avto-tasdiqlash yo'q. Qo'lda yuklangan fayl → papka → dastur.
- Power Query ishlatilmaydi. Excel VBA / Python / RPA / Power Automate.

---

## 4. Ish bosqichlari (kelishilgan reja)

| Step | Harakat |
|---|---|
| 0 | Davr, bo'lim, papka, fayl nomi qoidasini belgilash |
| 1 | Baholash qoidasini masterga aylantirish (OK/要確認/NG, qaytarish matni) |
| 2 | Datani papkaga yig'ish (qo'lda DL) |
| 3 | O'qish + standartlash (ustun nomi, sana, vaqt, ID, summa, joy nomi) |
| 4 | Solishtirish (ism/ID + sana asosiy kalit) |
| 5 | Baholash (6 nuqta + sabab) |
| 6 | 7-varaqli Excel chiqarish |
| 7 | Tasdiqlovchi ko'rib chiqishi |
| 8 | Tuzatishdan keyin qayta tekshirish |
| 9 | Phase2/3 avtomatlash |

---

## 5. ⚠️ Ochiq masalalar — yapon tomondan so'rash kerak

| # | Masala | Nega muhim |
|---|---|---|
| 1 | **判定ルール / 旅費規定 (J-4-1) fayli yo'q** | Kunlik nafaqa/limit/masofa qoidalari. Bularsiz pul/limit bahosini (6-nuqta #3) qura olmaymiz. **Eng katta blok.** |
| 2 | **社員番号 ko'prigi** — eski raqam (`139`) ↔ rasmiy ID (`AH000121`) jadvali bormi? | Yo'q bo'lsa ism orqali solishtiramiz, lekin bir xil ism xavfi bor. |
| 3 | **Joy nomi mapping** — CSVdagi `リンクステック石岡` ↔ master `リンクステック株式会社[下館工場]` qanday moslanadi? | Masofa bahosi shunga bog'liq. Nom farqlari ko'p. |
| 4 | **Chegaralar** — vaqt farqi "kichik/katta" necha daqiqa? (30/60/90?) Pul limiti aniq raqamlari? | Baho qoidasini aniq yozish uchun. |

---

## 6. Holat (status)

| Resurs | Holat |
|---|---|
| Spec hujjati | ✅ tayyor (yapon + o'zbekcha tarjima bor) |
| Safar CSV (75 ariza) | ✅ o'qildi |
| Davomat xlsx ×2 | ✅ o'qildi |
| 社員リスト / 顧客リスト | ✅ ochildi (parol `peeg0608`) |
| 承認者一覧 | ✅ o'qildi |
| **判定ルール / 旅費規定** | ❌ **yo'q — so'rash kerak** |
| 社員番号 ko'prigi | 🔴 yo'q — ism orqali vaqtincha |

**Keyingi qadam:** yuqoridagi 4 ochiq masalani yapon tomonga yuborish + prototip (Python tekshiruv varog'i, dastlabki qoidalar bilan) yasashni boshlash.
