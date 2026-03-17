import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import axios from 'axios';
import { Eye, EyeOff, Mail, Phone, User, Lock, Shield, GraduationCap, Users, BookOpen, Building, ArrowLeft, ArrowRight, Send, Calendar, MapPin, Briefcase, ChevronRight, Check, ChevronDown, FileText, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, clearError } = useAuth();
  const { t } = useLanguage();

  // Steps: 'form' -> 'details' -> 'verify' (phone) or direct register (email)
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'student',
    // Step 2 fields
    date_of_birth: '',
    gender: '',
    school_name: '',
    specialty: '',
    experience_years: '',
    organization_name: '',
    organization_type: '',
    organization_address: '',
    organization_role: '',
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Ommaviy Oferta
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const offerScrollRef = useRef(null);

  const offerText = `OYLIK TO'LOV ASOSIDA ONLAYN TA'LIM XIZMATLARIDAN FOYDALANISH BO'YICHA OMMAVIY OFERTA
ALIF24 AI TEXNOLOGIES MCHJ
Oxirgi yangilangan sana: 2026-yil 4-mart

1. UMUMIY QOIDALAR
1.1. Oferta maqsadi
Ushbu oferta Xaridorlarni (jismoniy shaxslarni) ro'yxatdan o'tkazish, identifikatsiya qilish va tasdiqlash tartibini, Alif24 platformasida elektron Shartnomalar tuzish tartibini belgilaydi, shuningdek, Xaridor va Platforma o'rtasidagi shu orqali yuzaga keladigan munosabatlarni tartibga soladi.
Mazkur oferta, shuningdek, onlayn ta'lim xizmatlarining oldi-sotdi munosabatlarini, ya'ni xaridor tomonidan oylik obuna bo'yicha kurslardan foydalanish va platforma tomonidan uni taqdim etish jarayonlarini ham tartibga soladi.
1.2. Qonun asoslari
O'zbekiston Respublikasida elektron tijorat, iste'molchilarning huquqlarini himoya qilish va shaxsga doir ma'lumotlardan foydalanish kabi sohalardagi munosabatlar quyidagi hujjatlar bilan tartibga solinadi:

O'zbekiston Respublikasi Fuqarolik kodeksi
"Elektron tijorat to'g'risida"gi Qonun
Vazirlar Mahkamasining 2016-yil 2-iyundagi 185-son qarori bilan tasdiqlangan "Elektron tijoratni amalga oshirish qoidalari"
"Iste'molchilar huquqlarini himoya qilish to'g'risida"gi Qonun
"Shaxsga doir ma'lumotlar to'g'risida"gi Qonun
Boshqa normativ-huquqiy hujjatlar


2. ASOSIY TUSHUNCHALAR
Aksept - Xaridor tomonidan oylik to'lovni amalga oshirganligi oferta shartnomasining shartlariga rozi bo'lib, qabul (aksept) qilgani va taraflar o'rtasida shartnoma tuzilganini bildiradi.
Bank - Xaridorning yoki uning vakilining mavjud barcha bank kartalaridan to'lov va qarzdorlikni hisobdan yechish va ushbu yechilgan mablag'larni sotuvchining joriy hisob raqamiga o'tkazish bo'yicha xizmatlarni ko'rsatadigan moliya instituti.
Ro'yxatdan o'tgan telefon raqami - platformada ro'yxatdan o'tish jarayonida Xaridor o'zini identifikatsiyalash uchun ko'rsatgan va Sotuvchi tomonidan tasdiqlangan mobil telefon raqami.
Xaridor - identifikatsiyadan o'tish maqsadida Platformaga murojaat qilgan va Platformaning imkoniyatlari, funksiyalari va tashkiliy mexanizmlaridan foydalangan holda kerakli tarzda xizmatlarni oylik obuna asosida sotib olish istagini bildirgan jismoniy shaxs.
Shaxsiy kabinet - bu veb-sayt yoki mobil ilova ichidagi cheklangan foydalanuvchi maydoni bo'lib, unda Xaridor masofaviy identifikatsiya jarayonidan o'tadi, to'lov qobiliyatini tekshiradi, shartnomalar bo'yicha takliflarni tuzadi va qabul qiladi, amalga oshirilgan shartnomalar haqida ma'lumot olish imkoniyatiga ega bo'ladi va Platformada boshqa zarur amallarni bajaradi.
Sotuvchi - Toshkent shahrida joylashgan ALIF24 AI TEXNOLOGIES MCHJ.
Platforma - bu Sotuvchi va Xaridor o'rtasidagi o'zaro munosabatlarni ta'minlash uchun axborot tizimi orqali xizmatlarni sotishga mo'ljallangan tashkiliy, axborot va texnik yechimlardan iborat dasturiy-ta'minot majmuasi.
Sayt - https://alif24.uz manzilida joylashgan Platformaning internet-resursi.
Push-xabar - bu Platforma tomonidan Xaridorning mobil qurilmasi ekranida paydo bo'ladigan qisqa xabar shaklida Xaridorga yuboriladigan bildirishnoma.
Elektron aloqa kanali - Xaridor bilan aloqaning har qanday elektron shakli, shu jumladan har qanday masofaviy xizmat ko'rsatish kanali orqali, Xaridorning ro'yxatdan o'tgan telefon raqamiga SMS-xabar yoki push-xabarnoma yoki Xaridorning ro'yxatdan o'tgan elektron pochta qutisiga elektron pochta orqali o'rnatilgan aloqa.

3. SHARTNOMA PREDMETI
3.1. Xizmatlar tarkibi
Mazkur oferta shartlariga muvofiq Sotuvchi Xaridor tomonidan tanlangan onlayn o'quv kurslari bo'yicha o'qitish xizmatlarini ko'rsatish, Xaridor esa ushbu xizmatlarni oylik obuna asosida qabul qilib, ularning qiymatini muntazam to'lash majburiyatini oladi (bundan keyin - Xizmatlar).
Ushbu xizmatlar Xaridorga shaxsiy kabineti orqali elektron o'quv materiallariga cheklangan muddatga kirish imkoniyatini beruvchi onlayn-kurslar to'plami, malakali va texnik yordam, uy vazifalarini tekshirish, kursni muvaffaqiyatli tugatgani to'g'risida sertifikat berishni o'z ichiga oladi.
3.2. Kurs tavsifi
Kurslarning tavsifi, uning davomiyligi, formati, shuningdek, ta'lim natijalari Alif24 platformasida batafsil bayon etilgan.

4. ALIF24 PLATFORMASIDA RO'YXATDAN O'TISH TARTIBI
4.1. Ro'yxatdan o'tish talabi
Alif24 platformasida harakatlarni amalga oshirish va xizmat(lar)ni oylik obuna asosida sotib olish uchun Xaridor dastlab alif24.uz sayti orqali ro'yxatdan o'tishi kerak.
4.2. Identifikatsiya
Boshlanishida Xaridor alif24.uz platformasiga o'ziga tegishli plastik bank kartasi (UzCARD, HUMO, Visa va/yoki Mastercard) ulangan mobil telefon raqamini (ya'ni SMS-xabarnoma xizmati bog'langan telefon raqami) kiritishi va tegishli maydonda telefon raqamini tasdiqlash uchun SMS orqali olingan noyob kodni kiritishi shart.
Agar xizmat bolalarga sovg'a qilish maqsadida sotib olinayotgan bo'lsa, qo'shimcha ravishda sovg'a qabul qiluvchi bolaning ismi, familiyasi va yoshi, shuningdek, to'liq yashash manzili (tuman, shaharcha, ko'cha, uy raqami) kiritilishi shart. Ushbu ma'lumotlar sovg'ani yetkazib berish va rasmiylashtirish uchun ishlatiladi.
4.2.1. Ovoz yozib olishga rozilik
Olimpiada va testlarda qatnashish uchun Xaridor (yoki qonuniy vakili) bolaning ovozini avtomatik yozib olishga va ushbu ovoz yozuvlaridan quyidagi maqsadlarda foydalanishga aniq rozilik bildiradi:

Platformaning AI tizimlarini o'qitish va takomillashtirish maqsadida dataset tayyorlash
Keyingi kirishlarda bolaning o'zini avtomatik aniqlash
O'qish progressini va natijalarini baholash
Boshqa bolalarning o'qiyotganligini aniqlash va shaxslashtirilgan tavsiyalar berish

Ovoz yozuvlari faqat yuqoridagi maqsadlarda ishlatiladi va uchinchi shaxslarga berilmaydi.
4.3. Rozilik
Xaridor SMS tasdiqlovni olganidan so'ng, shaxsiy va boshqa ma'lumotlariga ishlov berish hamda saqlash bo'yicha Platforma siyosati bilan, shuningdek, elektron tijorat orqali oylik obuna asosida onlayn ta'lim xizmatlaridan foydalanishga oid Umumiy shartlar (Ommaviy oferta) bilan tanishganligini va ularga roziligini tasdiqlaydi.
4.4. To'lov ma'lumotlari
Ro'yxatdan o'tishni davom ettirish uchun Xaridor plastik bank kartasi raqami hamda amal qilish muddatini kiritishi kerak. Shundan keyin, Xaridor mazkur shartnomaning 4.2-bandiga muvofiq kiritgan telefon raqamiga noyob kodli SMS-xabar yuboriladi, uni kiritish orqali Xaridor Alif24 platformasida sotib olgan tovar va xizmatlar uchun barcha to'lovlar mazkur bank kartasi orqali amalga oshirilishiga rozilik bildiradi.
4.5. Tasdiqlash
Ushbu Umumiy qoidalarning 4.2, 4.3, 4.4-bandlarida ko'rsatilgan ma'lumotlar to'liq kiritilgandan so'ng, Alif24 platformasi to'lov qobiliyatini baholash tartib-taomilini amalga oshiradi va Xaridorga kiritilgan ma'lumotlar tasdiqlashdan muvaffaqiyatli o'tganligi to'g'risida yoki tasdiqlash rad etilganligi to'g'risida elektron xabar yuboradi.
4.6. Qayta ro'yxatdan o'tish
Tasdiqlash rad etilganligi to'g'risida elektron xabar olingan taqdirda, Alif24 platformasi tomonidan qayd etilgan kamchiliklarni bartaraf etishni hisobga olgan holda, Xaridor 4.2, 4.3, 4.4-bandlarida ko'rsatilgan ma'lumotlarni kiritishni takrorlashi mumkin.
4.7. Ro'yxatdan o'tishning yakuni
Tasdiqlashdan muvaffaqiyatli o'tganlik to'g'risida elektron xabar kelgach, Xaridor Alif24 platformasidagi shaxsiy kabinetiga kirish huquqiga ega bo'ladi. Shu paytdan boshlab, Xaridorni Alif24 platformasida ro'yxatdan o'tkazish, identifikatsiya qilish va tekshirish jarayoni tugallangan hisoblanadi va quyidagi shartlar asosida oylik obuna evaziga xizmatlardan foydalanishga haqli bo'ladi.

5. TARAFLARNING HUQUQ VA MAJBURIYATLARI
5.1. Sotuvchining huquqlari
5.1.1. Sotuvchi, taqdim etilgan hujjatlarning elektron (skanerlangan) nusxalarining haqiqiyligi yoki ishonchliligiga shubha tug'ilganda, Xaridorni ro'yxatdan o'tkazishni yoki xizmat ko'rsatishni rad etish huquqiga ega.
5.1.2. Xaridor bilan kelishuvsiz kurs mazmuniga (to'liq yoki qisman) o'zgartirishlar kiritish.
5.1.3. Saytda texnik resurslar bo'yicha zarur rejali texnik xizmat olib borish va ta'mirlash ishlarini bajarish uchun kurs va saytning ishlashini vaqtincha to'xtatib turish.
5.1.4. Agar kursda murabbiy (mentor) xizmati nazarda tutilgan bo'lsa, shartnoma bo'yicha o'z majburiyatlarini bajarmagan kurs murabbiylarini almashtirish.
5.1.5. Mazkur shartnomada belgilangan holatlarda shartnomani bir tomonlama bekor qilish.
5.1.6. Xizmatlar sifatini oshirish maqsadida Xaridor bilan bo'lgan telefon suhbatlarni yozib olish.
5.1.7. Mazkur shartnomada belgilangan shartlar topilmagan taqdirda Xaridorga sertifikat berishdan bosh tortish.
5.2. Sotuvchining majburiyatlari
5.2.1. Xaridor belgilangan talablarni bajargan taqdirda uni platformada ro'yxatdan o'tkazish.
5.2.2. Xaridor tomonidan to'lov amalga oshirilgan kundan boshlab tovar va xizmatlarga kirish imkoniyatini 24 soat ichida taqdim etish. Texnik uzilishlar yoki kirishni o'z vaqtida ta'minlashga to'sqinlik qiluvchi boshqa kutilmagan holatlar yuzaga kelgan taqdirda, Sotuvchi zudlik bilan Xaridorni yuzaga kelgan vaziyat haqida xabardor qiladi va uni imkon qadar tezroq bartaraf etish uchun barcha zarur choralarni ko'radi.
5.2.3. Agar kursda murabbiy (mentor) xizmati mavjud bo'lsa, Xaridor tomonidan bajarilgan uy vazifalarini tekshirishi va ularning natijalarini 7 (yetti) ish kuni ichida Xaridorga taqdim etishi kerak.
5.2.4. Toshkent shahri mahalliy vaqti bilan soat 10:00 dan 19:00 gacha bo'lgan vaqtda Xaridorlarga malakali yordam ko'rsatish, savollarga bir soat ichida javob berish.
5.2.5. Kursga, uning materiallariga kirish va o'quv platformasining ishlashi bo'yicha texnik yordamni Xaridor murojaat qilgan paytdan boshlab doimiy, ya'ni haftaning 7 kuni davomida 24 soat ichida ta'minlash.
5.2.6. To'lovi to'liq amalga oshirilgan kurslarning video darslari va boshqa o'quv materiallaridan foydalanishning texnik imkoniyatini shartnoma tuzilgan kundan e'tiboran 3 (uch) yilgacha, qisqa kurslar uchun esa 1 (bir) yilgacha ta'minlash.
5.2.7. Quyidagi mezonlar bajarilgan taqdirda, kursni muvaffaqiyatli tugatgani haqida Xaridorga sertifikat berish:
a) Kurs dasturini to'liq o'tish: Xaridor kurs dasturini, uning barcha modullari, bo'limlari va darslarini to'liq o'tishi kerak.
b) Barcha uy vazifalari va testlarni bajarish: Xaridor har bir modul yoki kurs bo'yicha barcha uy vazifalarini, jumladan loyiha ishlari, testlar yoki imtihonlarni belgilangan talablarga muvofiq muvaffaqiyatli (o'zlashtirish darajasi 80 foiz va undan yuqori) bajarishi kerak.
c) Kurs narxini to'liq to'lash: Sertifikat olish uchun Xaridor kurs narxini to'liq to'lagan bo'lishi shart.
5.2.8. Xaridorning shaxsga doir ma'lumotlaridan O'zbekiston Respublikasining qonunchiligida ruxsat etilgan tartibda foydalanish, ishlov berish hamda uchinchi shaxslarga oshkor qilmaslik, ularning maxfiyligini ta'minlash.
5.2.9. Agar kurs doirasida mentor xizmati nazarda tutilgan bo'lsa, u shartnoma tuzilgan kundan boshlab 8 (sakkiz) oygacha ta'minlanadi.
5.3. Xaridorning majburiyatlari
5.3.1. Ushbu Shartnoma shartlariga muvofiq, o'z vaqtida to'lovni amalga oshirish.
5.3.2. Kompyuter, smartfon va boshqa elektron qurilmalarda to'lov vositalarining ishonchliligi va xavfsizligini ta'minlash.
5.3.3. Sotuvchining taklifini va to'lov shartlarini qabul qilishdan oldin, shartnoma shartlarini (narx, tanlangan o'quv kursi turi, to'lov usuli, javobgarlik va hokazo) diqqat bilan tanishib chiqish.
5.3.4. Xizmatlarni faqat shaxsiy maqsadlar uchun sotib olish va tadbirkorlik yoki daromad topish maqsadida foydalanmaslik.
5.3.5. Shaxsiy hisob raqamining identifikatsiya ma'lumotlarini uchinchi shaxslarga oshkor qilmaslik va ularni himoyalash.
5.3.6. alif24.uz platformasi va shaxsiy kabinetida e'lon qilingan xabarlar va bildirishnomalarni muntazam kuzatib borish.
5.3.7. Sotuvchi va uning xodimlari bilan muloqot jarayonida umum-e'tirof etilgan odob-axloq qoidalariga rioya qilish.
5.3.8. O'zbekiston Respublikasining "Shaxsga doir ma'lumotlar to'g'risida"gi Qonuniga muvofiq, shartnoma tuzish va amalga oshirish uchun shaxsiy ma'lumotlarni ishlov berishga to'liq rozilik berish.
5.4. Xaridorning huquqlari
5.4.1. Sotuvchidan ushbu Shartnomada va amaldagi qonunchilikda belgilangan hajm, sifat va muddatlarda Xizmatlarni ko'rsatishni talab qilish.
5.4.2. Shaxsiy kabinet, mobil ilova yoki boshqa masofaviy aloqa kanallari orqali kurs materiallariga va qo'shimcha resurslarga Shartnomada ko'rsatilgan muddat davomida uzluksiz kirish imkoniyatiga ega bo'lish.
5.4.3. Kurs bo'yicha texnik nosozliklar, kirishdagi uzilishlar yoki boshqa xizmat sifati bilan bog'liq muammolar yuzaga kelgan taqdirda, Sotuvchidan bepul va o'z vaqtida texnik yordam olish.
5.4.4. Kurs mazmuniga yoki sifatiga nisbatan e'tirozlar bo'lsa, Shartnomada belgilangan tartibda, belgilangan muddat ichida ularni ko'rib chiqish va hal etish uchun Sotuvchiga murojaat qilish.
5.4.5. Kursni o'zlashtirish jarayonida Sotuvchidan malakali maslahat va o'quv-metodik yordam olish.
5.4.6. Shartnoma shartlarini buzmasdan xizmatlardan voz kechish huquqidan Shartnomada belgilangan tartib va muddatlarda foydalanish.
5.4.7. Kursni muvaffaqiyatli yakunlagan taqdirda, Shartnomada belgilangan mezonlarga mos sertifikatni bepul olish.
5.4.8. Shaxsiy ma'lumotlarning maxfiyligi va himoyasi bo'yicha O'zbekiston Respublikasi qonunchiligi talablariga rioya etilishini talab qilish.

6. TO'LOV TARTIBI VA OYLIK OBUNA NARXI
6.1. Narxni belgilash
Oylik obuna narxi alif24.uz platformasida ko'rsatiladi. Xaridor tomonidan tanlangan tarif va to'lov turi Xaridorning shaxsiy kabinetida aks ettiriladi hamda ushbu ma'lumotlar mazkur Shartnomaning ajralmas qismi hisoblanadi.
6.2. Oylik obuna tizimi
Xaridor kurslarni oylik obuna asosida foydalanadi. To'lov har oy davomida muntazam amalga oshiriladi va to'lov amalga oshirilgan taqdirda, Sotuvchi Xaridorga platformaga kirish va kurs materiallaridan foydalanish huquqini beradi.
6.3. Obunani bekor qilish
Oylik obuna istalgan vaqtda to'xtatilishi mumkin. Obuna to'xtatilganda, joriy oy oxirigacha xizmatlardan foydalanish davom etadi, keyingi oy uchun to'lov amalga oshirilmaydi.
6.4. Aksept sifatida to'lov
Xaridor tomonidan oylik to'lovning amalga oshirilishi ushbu Shartnoma shartlariga aksept (ya'ni taklifni qabul qilish) sifatida tan olinadi hamda Shartnoma to'lov amalga oshirilgan paytdan boshlab kuchga kiradi.
6.5. To'lovni tasdiqlash
Sotuvchi Xaridorga oylik to'lov muvaffaqiyatli amalga oshirilganligi to'g'risida elektron xabarnoma yuborishi yoki bu haqidagi ma'lumotni Xaridorning shaxsiy kabinetida aks ettirishi orqali tasdiqlaydi.
6.6. Kirish imkoniyati
Sotuvchi Xaridor tomonidan oylik to'lov amalga oshirilgan kundan boshlab belgilangan muddat ichida kurs materiallariga to'liq kirish imkonini ta'minlash majburiyatini oladi.
6.7. Valyuta va to'lov tizimlari
Sotuvchining platformasidagi tovar va xizmatlar narxi O'zbekiston Respublikasining milliy valyutasi - so'mda, barcha soliqlar va boshqa majburiy to'lovlar hisobga olingan holda ko'rsatilgan. Mazkur shartnoma asosida taqdim etilayotgan xizmatlar uchun to'lov Xaridor tomonidan turli to'lov tizimlari (masalan, UZCARD, HUMO, Payme, Click va boshqalar) orqali amalga oshirilishi mumkin.
6.8. Avtomatik to'lov
Xaridor, bank kartasini Alif24 platformasi orqali ulaganda, oylik to'lovni har oy avtomatik ravishda o'z bank kartasidan to'g'ridan-to'g'ri yechib olishga rozilik bildiradi.

7. OBUNANI BEKOR QILISH VA QAYTARISH TARTIBI
7.1. Obunani to'xtatish
Xaridor oylik obunani o'z shaxsiy kabinetida istalgan vaqtda to'xtatishi mumkin. Obuna to'xtatilganda:

Joriy oy oxirigacha xizmatlardan foydalanish davom etadi
Keyingi oy uchun to'lov amalga oshirilmaydi
To'langan mablag'lar qaytarilmaydi

7.2. Pulni qaytarish shartlari
Agar Xaridorda kurs bo'yicha taqdim etilgan xizmatlarga nisbatan e'tirozi bo'lsa, u kurslardan foydalanish uchun platformaga kirish huquqi berilgan vaqtdan boshlab (Asia/Tashkent vaqt zonasida) 5 (besh) kalendar kun ichida Sotuvchiga xabar berishi kerak.
Agar ushbu 5 kalendar kun ichida Xaridor darslarning videokurs davomiyligi bo'yicha hisoblangan 10 (o'n) foizidan kamrog'ini ko'rib chiqqan va shartnoma tuzilganiga 5 kundan kam vaqt o'tgan bo'lsa, Xaridorning talabiga ko'ra, to'lov qaytariladi va obuna bekor qilinadi.
Biroq, ko'rilgan va o'zlashtirilgan darslar videokurs davomiyligi bo'yicha 11 (o'n bir) foiz yoki undan ko'proq bo'lsa, obuna bekor qilinmaydi va to'lov Xaridorga qaytarilmaydi. Xizmatlar to'liq ko'rsatilgan deb hisoblanadi.
7.3. Muddatdan keyin
Yuqoridagi 5 kunlik muddat o'tganidan keyin e'tirozlar qabul qilinmaydi va Xaridor kursning keyingi qismini o'zlashtirmagan, qatnashmagan yoki boshqa sabablarga ko'ra ta'lim jarayonini davom ettirmagan taqdirda ham, u ushbu Shartnomaga muvofiq belgilangan to'lov majburiyatlarini to'liq hajmda bajarishi shart.
7.4. Pulni qaytarish tartibi
Pulni qaytarish jarayonini boshlash uchun Xaridor shartnomani bekor qilish sabablarini va kurs uchun to'langan summani tasdiqlovchi hujjatlarni ilova qilgan holda Support bo'limiga yozma murojaat qilishi shart. Sotuvchi arizani olgandan keyin 14 ish kuni ichida uni ko'rib chiqadi va pul mablag'larini qaytarish bo'yicha qaror qabul qilib, bu haqda Xaridorga xabar beradi. Ijobiy qaror qabul qilingan kundan boshlab, pul mablag'lari Xaridorning plastik kartasiga 30 kalendar kuni ichida qaytariladi.

8. FORS-MAJOR HOLATLARI
8.1. Fors-major tushunchasi
Agar shartnoma bo'yicha majburiyatlarni bajarmaslik yengib bo'lmaydigan kuch oqibatida (fors-major), shartnoma tuzilgandan so'ng yuzaga kelgan favqulodda hodisalar natijasida (urush, suv toshqini, yer qimirlashi, epidemiya, hukumat qarorlari va h.k.) vujudga kelgan bo'lsa, Taraflar shartnoma bo'yicha majburiyatlari qisman yoki to'liq bajarilmagani uchun javobgarlikdan ozod etiladilar.
8.2. Majburiyatlardan ozod qilish
Fors-major holatlari yuzaga kelgan vaqtda "Taraflar" ushbu holatlar bartaraf etilguniga qadar shartnoma bo'yicha o'zaro majburiyatlarini bajarishdan ozod bo'ladilar.
8.3. Xabardor qilish
Yuzaga kelgan fors-major holatlari haqida hamda ushbu holatlar yakunlanganligi haqida har bir Taraf ushbu holatlar yuzaga kelgan yoki bartaraf etilgan vaqtdan boshlab, 3 (uch) ish kuni ichida bu haqda ikkinchi tarafni yozma ravishda xabardor qilishi lozim.
8.4. Shartnomani bekor qilish
Fors-major holatlari 30 kun mobaynida bartaraf etilmagan taqdirda taraflar ushbu shartnomani muddatidan oldin bekor qilishga haqli bo'ladilar.

9. TARAFLARNING JAVOBGARLIGI
9.1. Mualliflik huquqlari
Alif24 platformasida nashr etilgan barcha matn, grafik va video materiallar mualliflik huquqlari bilan himoyalangan bo'lib, ularni noqonuniy ishlatish O'zbekiston Respublikasining amaldagi qonunchiligiga zid ravishda javobgarlikka sabab bo'ladi.
9.2. Texnik javobgarlikning chegaralari
Alif24 platformasining funksionalligini ta'minlovchi dasturiy va apparat komplekslaridagi nosozliklar, xatolar yoki uzilishlar, shuningdek, Xaridorning Platformaga aloqasi bo'lmagan sabablar tufayli dasturiy yoki apparat vositalaridan vaqtincha foydalana olmasligi yoki shunga bog'liq bo'lgan zararlari uchun Platforma yoki Sotuvchi javobgar emas.
9.3. Javobgarlikdan ozod qilish holatlari
Quyidagi holatlarda kelib chiqqan zararlar uchun Sotuvchi javobgar emas:
a) Xaridorning Alif24 platformasiga kirishda ishlatadigan qurilmalarida yoki dasturiy ta'minotida mavjud bo'lgan viruslar yoki boshqa zararli dasturlar;
b) Alif24 platformasidan foydalanishda noto'g'ri ma'lumotlarni kiritish;
c) Xaridor tomonidan Shartnoma shartlarining buzilishi;
d) Xaridor tomonidan to'lov tartib-qoidalarining buzilishi;
e) Xaridor platformadagi login va parollarni unutib qo'yishi natijasida kurslardan foydalana olmaganligi.
9.4. Kirishni cheklash huquqi
Sotuvchi quyidagi holatlarda Xaridorning shaxsiy kabinetiga kirishni cheklash huquqini o'zida saqlab qoladi:
a) Xaridor tomonidan boshqa xaridorlar yoki uchinchi shaxslarning huquqlarini yoki qonuniy manfaatlarini buzilganligi haqida da'volar kelib tushganda;
b) Xaridor Alif24 platformasining dasturiy ta'minotiga ruxsatsiz o'zgartirishlar kiritilganligi aniqlanganda;
c) Xaridor tomonidan Shartnoma shartlari buzilganda.
9.5. Bir tomonlama bekor qilish
Sotuvchi Xaridor tomonidan quyidagi holatlar yuz berganda ushbu shartnomani bir tomonlama tartibda bekor qilish huquqini o'zida saqlab qoladi va to'lovni qaytarmaydi:
a) Kurs materiallarini ko'chirish, tarqatish, qayta sotish yoki kurs kontentiga noqonuniy kirishga urinishlar;
b) Kursning majburiy vazifalarini muntazam ravishda (2-martadan ortiq) bajarmaslik;
c) Jamoatchilik oldida Sotuvchining brendi yoki obro'sini to'kish, shubha ostiga qo'yish, yolg'on ma'lumotlar tarqatish va h.k. orqali diskreditatsiya qilish;
d) Kurs to'lovlarini 15 kalendar kundan ortiq kechiktirish;
e) Kurs muhokamasi bo'ladigan guruhlarda (sayt, telegram, instagram va boshqa ijtimoiy tarmoqlarda) muloqot qilish jarayonida odob-axloq qoidalariga rioya qilmaslik;
f) Noqonuniy faoliyat bilan shug'ullanganda, shu jumladan xakerlik kabi xatti-harakatlar bilan shug'ullanishi aniqlanganda.

10. NIZOLARNI HAL QILISH TARTIBI
10.1. Muzokaralar
Mazkur shartnoma bo'yicha vujudga kelishi mumkin bo'lgan barcha nizo va kelishmovchiliklar taraflar tomonidan o'zaro muzokaralar o'tkazish orqali hal etiladi.
10.2. Sud yo'li
Agar nizolarni muzokaralar yo'li bilan hal etish imkonsiz bo'lsa yoki taraflar biror shartnomaga erisha olmasalar, taraflar nizoni hal qilish uchun O'zbekiston Respublikasining amaldagi qonunchiligiga muvofiq Fuqarolik ishlari bo'yicha Toshkent shahri sudida hal qilinadi.

11. SHAXSGA DOIR MA'LUMOTLARDAN FOYDALANISH TARTIBI
11.1. Himoya majburiyati
Sotuvchi xaridor tomonidan taqdim etilgan shaxsiy ma'lumotlarni qonunchilikda belgilangan tartibda va darajada himoyada bo'lishi va sir saqlanishi uchun javobgardir.
11.2. Xavfsizlik ta'rifi
Shaxsga doir ma'lumotlarning xavfsizligi deganda shaxsga doir ma'lumotlardan noqonuniy ravishda va/yoki ruxsatsiz foydalanishdan, shaxsga doir ma'lumotlarni yo'q qilishdan, o'zgartirishdan, blokirovka qilishdan, nusxalashdan, taqdim etishdan, tarqatishdan, shuningdek shaxsga doir ma'lumotlarga nisbatan boshqa noqonuniy harakatlardan himoyalangan muhitni ta'minlash nazarda tutiladi.
11.3. Sovg'a uchun ma'lumotlarni uzatish
Agar xizmat bolalarga sovg'a qilish maqsadida sotib olingan bo'lsa, Sotuvchi sovg'a qabul qiluvchi bolaga tegishli quyidagi ma'lumotlarni sovg'ani yetkazib berish va rasmiylashtirish uchun uchinchi shaxslarga (yetkazib berish xizmatlari, rasmiylashtirish organlari) yuborish huquqiga ega:

ismi, familiyasi, otasining ismi;
tug'ilgan sanasi va yoshi;
to'liq yashash manzili (tuman, shaharcha, ko'cha, uy raqami);
aloqa telefon raqami;
sovg'ani beruvchi shaxs haqida ma'lumot.

11.3.1. Ovoz yozuvlaridan foydalanish
Sotuvchi olimpiada va testlar davomida yozib olingan bolalar ovozlaridan quyidagi maqsadlarda foydalanish huquqiga ega:

Platformaning AI tizimlarini o'qitish va takomillashtirish uchun dataset tayyorlash
Bolaning ovozini tanish orqali avtomatik identifikatsiya tizimini rivojlantirish
O'qish progressini va natijalarini obyektiv baholash
Shaxslashtirilgan o'quv tavsiyalari berish
Platforma sifatini yaxshilash uchun analitik ma'lumotlar to'plash

Ovoz yozuvlari shifrlangan holda saqlanadi va faqat Sotuvchining AI tizimlari tomonidan qayta ishlash uchun ishlatiladi. Uchinchi shaxslarga ovoz yozuvlari berilmaydi.
11.4. Rozilik
Xaridor sovg'a qabul qiluvchi bolaning yuqoridagi ma'lumotlarini sotuvchiga foydalanish va sovg'ani yetkazib berish hamda rasmiylashtirish uchun tarqatish huquqini beradi. Xaridorga yuqoridagi ma'lumotlarni sovg'ani yetkazib berish maqsadida boshqa uchinchi shaxslarga yuborganlik uchun javobgarlik qo'llanilmaydi.
Xaridor, shuningdek, olimpiada va testlar davomida bolaning ovozini yozib olishga va ushbu ovoz yozuvlaridan 11.3.1-bandda ko'rsatilgan maqsadlarda foydalanishga to'liq rozilik bildiradi.
11.5. Ma'lumotlarni so'rash huquqi
Platformaga pochta manzili yoki Internet orqali kontaktdan foydalanish bilan tegishli yozma so'rov yuborish orqali, shuningdek, Xaridorning shaxsiy kabinetidan so'rov yuborish orqali, Xaridor Platformadan o'zining shaxsiy ma'lumotlari, ularga ishlov berish va foydalanish to'g'risida to'liq ma'lumot so'rashga, shuningdek, noto'g'ri yoki to'liq bo'lmagan shaxsiy ma'lumotlarni chiqarib tashlash yoki tuzatish/qo'shishni talab qilishga haqli.
11.6. Rozilik muddati
Xaridor shartnoma tuzilgan kundan boshlab 3 (uch) yil davomida Sotuvchining uning shaxsiy ma'lumotlarini amaldagi qonunchilikka muvofiq qayta ishlashiga rozilik beradi. Ushbu rozilik Xaridor tomonidan Platformaga pochta manzili bo'yicha yozma ariza yuborish yoki Alif24 platformasida Xaridorning shaxsiy kabinetidan so'rov yuborish orqali bekor qilinishi mumkin.

12. YAKUNIY QOIDALAR
12.1. Oferta kuchga kirishi
Ushbu oferta shartnomasi e'lon qilingan sanadan boshlab, ikkinchi taraf uchun aktsept qilgan paytdan boshlab kuchga kiradi va Tomonlar o'z majburiyatlarini to'liq bajargunlaricha qadar amal qiladi.
12.2. O'zgartirishlar
Ushbu shartnomaga qilinadigan barcha ilovalar, qo'shimchalar va o'zgarishlar ushbu shartnomaning ajralmas qismi hisoblanadi.
12.3. Shartnomaning elektron shakli
Mazkur Shartnoma elektron shaklda tuziladi va elektron imzo, SMS-kod, push-xabar, yoki shaxsiy kabinet orqali tasdiqlangan aksept bilan bir xil yuridik kuchga ega hisoblanadi.

13. MANZIL VA BOG'LANISH
13.1. Sotuvchi manzili
ALIF24 AI TEXNOLOGIES MCHJ
Manzil: O'zbekiston Respublikasi, Toshkent shahri
Email: info@alif24.uz
Telefon: +998 90 827 83 58
Veb-sayt: https://alif24.uz
13.2. Qo'shimcha ma'lumotlar
Texnik yordam: support@alif24.uz
Maxfiylik: privacy@alif24.uz

© 2026 ALIF24 AI TEXNOLOGIES MCHJ. Barcha huquqlar himoyalangan.`;

  const scrollOfferToBottom = useCallback(() => {
    if (offerScrollRef.current) {
      offerScrollRef.current.scrollTo({
        top: offerScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleOfferAccept = useCallback(() => {
    setOfferAccepted(true);
    setShowOfferModal(false);
  }, []);
  const [loginType, setLoginType] = useState('phone');

  const roles = [
    {
      value: 'student',
      label: t('auth_role_student') || "O'quvchi",
      icon: <BookOpen className="w-5 h-5" />,
      description: t('auth_role_student_desc') || "O'quvchi sifatida o'rganish"
    },
    {
      value: 'teacher',
      label: t('auth_role_teacher') || "O'qituvchi",
      icon: <GraduationCap className="w-5 h-5" />,
      description: t('auth_role_teacher_desc') || "O'qituvchi sifatida dars berish"
    },
    {
      value: 'parent',
      label: t('auth_role_parent') || "Ota-ona",
      icon: <Users className="w-5 h-5" />,
      description: t('auth_role_parent_desc') || "Bolangizning progressini kuzatish"
    },
    {
      value: 'organization',
      label: "Ta'lim tashkiloti",
      icon: <Building className="w-5 h-5" />,
      description: "Maktab yoki o'quv markazi uchun"
    }
  ];

  const specialties = [
    "Matematika", "Fizika", "Kimyo", "Biologiya", "Informatika",
    "Ona tili", "Adabiyot", "Ingliz tili", "Tarix", "Geografiya",
    "Boshlang'ich sinf", "Boshqa"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  // Step 1 validation — go to Step 2 (details)
  const goToDetails = () => {
    if (!formData.first_name.trim() || formData.first_name.trim().length < 2) {
      setError("Ism kamida 2 ta harfdan iborat bo'lishi kerak");
      return;
    }
    if (!formData.last_name.trim() || formData.last_name.trim().length < 2) {
      setError("Familiya kamida 2 ta harfdan iborat bo'lishi kerak");
      return;
    }
    if (loginType === 'phone' && !formData.phone.trim()) {
      setError("Telefon raqam kiritilmagan");
      return;
    }
    if (loginType === 'email' && !formData.email.trim()) {
      setError("Email kiritilmagan");
      return;
    }
    if (formData.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError("Parollar mos kelmaydi");
      return;
    }
    setError(null);
    setStep('details');
  };

  // Step 2 — proceed to verify or register
  const goToVerifyOrRegister = async () => {
    setError(null);
    if (loginType === 'phone') {
      await handleSendCode();
    } else {
      await handleEmailRegister();
    }
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError("Telefon raqam kiritilmagan");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.sendVerificationCode(formData.phone);

      if (response.success) {
        setStep('verify');
      } else {
        setError(response.message || "Kod yuborishda xatolik");
      }
    } catch (err) {
      if (err.message && err.message.includes("Telegram botga ulanmagan")) {
        setError(
          <span>
            Telefon raqam Telegram botga ulanmagan. Iltimos, avval{" "}
            <a href="https://t.me/alif24platform_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              @alif24platform_bot
            </a>{" "}
            ga kirib <b>/start</b> tugmasini bosing va raqamingizni yuboring.
          </span>
        );
      } else {
        setError(err.message || "Kod yuborishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  const buildSubmitData = () => {
    const submitData = { ...formData };
    if (submitData.role === 'admin') submitData.role = 'moderator';

    // Cleanup empty fields
    if (!submitData.email || submitData.email.trim() === '') delete submitData.email;
    if (!submitData.phone || submitData.phone.trim() === '') delete submitData.phone;
    if (!submitData.date_of_birth) delete submitData.date_of_birth;
    if (!submitData.gender) delete submitData.gender;
    if (!submitData.school_name || !submitData.school_name.trim()) delete submitData.school_name;
    if (!submitData.specialty) delete submitData.specialty;
    if (!submitData.experience_years) delete submitData.experience_years;
    else submitData.experience_years = parseInt(submitData.experience_years);
    if (!submitData.organization_name || !submitData.organization_name.trim()) delete submitData.organization_name;
    if (!submitData.organization_type) delete submitData.organization_type;
    if (!submitData.organization_address || !submitData.organization_address.trim()) delete submitData.organization_address;

    delete submitData.confirm_password;
    return submitData;
  };

  const redirectByRole = (role) => {
    switch (role) {
      case 'admin':
      case 'moderator':
      case 'organization':
        navigate('/organization-dashboard');
        break;
      case 'teacher':
        navigate('/teacher-dashboard');
        break;
      case 'parent':
        navigate('/parent-dashboard');
        break;
      case 'student':
        navigate('/student-dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError("Tasdiqlash kodini kiriting");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const verifyResponse = await authService.verifyCode(formData.phone, verificationCode);
      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "Noto'g'ri kod");
      }

      const submitData = buildSubmitData();
      await register(submitData);
      onClose();
      redirectByRole(submitData.role);
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = buildSubmitData();
      delete submitData.phone;

      await register(submitData);
      onClose();
      redirectByRole(submitData.role);
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // ======================== STEP INDICATORS ========================
  const stepNames = ['form', 'details', 'verify'];
  const stepLabels = ["Ma'lumotlar", "Qo'shimcha", "Tasdiqlash"];
  const currentStepIndex = stepNames.indexOf(step);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {stepLabels.map((label, i) => {
        const isActive = i === currentStepIndex;
        const isDone = i < currentStepIndex;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' :
              isDone ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
              {isDone ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              <span>{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <ChevronRight className={`w-3 h-3 ${isDone ? 'text-green-400' : 'text-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ======================== STEP 1: FORM ========================
  const renderFormStep = () => (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_first_name_label') || 'Ism'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder={t('auth_first_name_placeholder') || 'Ismingiz'}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_last_name_label') || 'Familiya'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder={t('auth_last_name_placeholder') || 'Familiyangiz'}
              required
            />
          </div>
        </div>
      </div>

      {/* Login type toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setLoginType('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm ${loginType === 'phone'
            ? 'bg-white shadow-sm text-indigo-600 font-medium'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Phone className="w-4 h-4" />
          {t('auth_phone') || 'Telefon'}
        </button>
        <button
          type="button"
          onClick={() => setLoginType('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm ${loginType === 'email'
            ? 'bg-white shadow-sm text-indigo-600 font-medium'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
      </div>

      {/* Email or Phone field */}
      {loginType === 'email' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_phone_number_label') || 'Telefon raqam'}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="+998 90 123 45 67"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">* Tasdiqlash kodi Telegram orqali yuboriladi</p>
        </div>
      )}

      {/* Password fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_password_label') || 'Parol'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Kamida 6 ta belgi"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_confirm_password_label') || 'Tasdiqlash'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Parolni takrorlang"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Role selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('auth_your_role') || 'Rolingiz'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => (
            <label
              key={role.value}
              className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${formData.role === role.value
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={formData.role === role.value}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`p-1.5 rounded-lg ${formData.role === role.value ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                {role.icon}
              </div>
              <div>
                <span className="text-sm font-medium block">{role.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{role.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={goToDetails}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        Davom etish
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Switch to login */}
      <div className="text-center text-sm text-gray-600">
        {t('auth_already_have_account') || "Akkauntingiz bormi?"}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {t('auth_login_button') || 'Kirish'}
        </button>
      </div>
    </div>
  );

  // ======================== STEP 2: DETAILS ========================
  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">
          {formData.role === 'student' && "O'quvchi ma'lumotlarini to'ldiring"}
          {formData.role === 'teacher' && "O'qituvchi ma'lumotlarini to'ldiring"}
          {formData.role === 'parent' && "Ota-ona ma'lumotlarini to'ldiring"}
          {formData.role === 'organization' && "Tashkilot ma'lumotlarini to'ldiring"}
        </p>
      </div>

      {/* Date of Birth & Gender — faqat student va teacher uchun */}
      {(formData.role === 'student' || formData.role === 'teacher') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Tug'ilgan sana
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jins</label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded-xl cursor-pointer transition-all text-sm ${formData.gender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="sr-only" />
                <span>Erkak</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded-xl cursor-pointer transition-all text-sm ${formData.gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="sr-only" />
                <span>Ayol</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Student-specific fields */}
      {formData.role === 'student' && (
        <>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              Ro'yxatdan o'tganingizdan keyin, o'qituvchi sizni sinfga taklif qiladi yoki siz kod orqali sinfga qo'shilasiz.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Maktab nomi (ixtiyoriy)
            </label>
            <input
              type="text"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: 1-son umumiy o'rta ta'lim maktabi"
            />
          </div>
        </>
      )}

      {/* Teacher-specific fields */}
      {formData.role === 'teacher' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Mutaxassislik
            </label>
            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {specialties.map(s => (
                <label key={s} className={`flex items-center justify-center py-2 px-1 border rounded-lg cursor-pointer transition-all text-xs font-medium ${formData.specialty === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <input type="radio" name="specialty" value={s} checked={formData.specialty === s} onChange={handleChange} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ish tajribasi (yil)</label>
            <input
              type="number"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleChange}
              min="0"
              max="50"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: 5"
            />
          </div>
        </>
      )}

      {/* Parent-specific fields — minimal, just common fields above */}
      {formData.role === 'parent' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-700">
            Ro'yxatdan o'tganingizdan keyin, bolangizni profilingizga qo'shishingiz mumkin bo'ladi.
          </p>
        </div>
      )}

      {/* Organization-specific fields (B2B) */}
      {formData.role === 'organization' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building className="w-3.5 h-3.5 inline mr-1" />
              Tashkilot nomi *
            </label>
            <input
              type="text"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: Bilim Ziyo o'quv markazi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tashkilot turi *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'maktab', label: 'Maktab' },
                { value: 'oquv_markazi', label: "O'quv markazi" },
                { value: 'boshqa', label: 'Boshqa' }
              ].map(t => (
                <label key={t.value} className={`flex items-center justify-center py-2.5 border rounded-xl cursor-pointer transition-all text-sm font-medium ${formData.organization_type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="organization_type" value={t.value} checked={formData.organization_type === t.value} onChange={handleChange} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Tashkilotdagi lavozimingiz *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'direktor', label: 'Direktor/Mudir' },
                { value: 'oqituvchi', label: "O'qituvchi" },
                { value: 'administrator', label: 'Administrator' },
                { value: 'boshqa', label: 'Boshqa' }
              ].map(r => (
                <label key={r.value} className={`flex items-center justify-center py-2.5 border rounded-xl cursor-pointer transition-all text-sm font-medium ${formData.organization_role === r.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="organization_role" value={r.value} checked={formData.organization_role === r.value} onChange={handleChange} className="sr-only" />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Manzil (ixtiyoriy)
            </label>
            <input
              type="text"
              name="organization_address"
              value={formData.organization_address}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Toshkent sh., Chilonzor t."
            />
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-xs text-indigo-700">
              Ro'yxatdan o'tuvchi: <strong>{formData.first_name} {formData.last_name}</strong>
            </p>
          </div>
        </>
      )}

      {/* Ommaviy Oferta Checkbox */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={offerAccepted}
            onChange={(e) => setOfferAccepted(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowOfferModal(true); }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 decoration-indigo-300 hover:decoration-indigo-500 transition-colors"
            >
              Ommaviy oferta
            </button>
            {' '}shartlarini o'qib chiqdim va qabul qilaman
          </span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setStep('form'); setError(null); }}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ortga
        </button>
        <button
          type="button"
          onClick={goToVerifyOrRegister}
          disabled={loading || !offerAccepted}
          className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : loginType === 'phone' ? (
            <>
              <Send className="w-4 h-4" />
              Kod yuborish
            </>
          ) : (
            <>
              Ro'yxatdan o'tish
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
      {!offerAccepted && (
        <p className="text-xs text-amber-600 text-center">Davom etish uchun ommaviy ofertani qabul qiling</p>
      )}
    </div>
  );

  // ======================== STEP 3: VERIFY ========================
  const renderVerifyStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Phone className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Tasdiqlash kodi</h3>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{formData.phone}</span> raqamiga Telegram orqali 6 xonali kod yuborildi
        </p>
      </div>

      <div className="flex justify-center my-4">
        <input
          type="text"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          className="w-52 text-center text-2xl tracking-[0.5em] py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50"
          placeholder="000000"
          autoFocus
        />
      </div>

      <button
        onClick={handleVerifyAndRegister}
        disabled={loading || verificationCode.length !== 6}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Tasdiqlash va ro'yxatdan o'tish
          </>
        )}
      </button>

      <button
        onClick={() => { setStep('details'); setError(null); }}
        className="w-full text-gray-600 py-2 hover:text-gray-900 flex items-center justify-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Ortga qaytish
      </button>
    </div>
  );

  // ======================== RENDER ========================
  if (!isOpen) return null;

  const stepTitles = {
    form: t('auth_register_title') || "Ro'yxatdan o'tish",
    details: "Qo'shimcha ma'lumotlar",
    verify: "Telefon tasdiqlash"
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl relative">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[step]}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          {renderStepIndicator()}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Step content */}
          {step === 'form' && renderFormStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'verify' && renderVerifyStep()}
        </div>
      </div>

      {/* Ommaviy Oferta Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Ommaviy Oferta</h3>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div
              ref={offerScrollRef}
              className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth"
              style={{ maxHeight: 'calc(85vh - 160px)' }}
            >
              {offerText.split('\n').map((line, i) => (
                <p key={i} className="text-gray-700 text-sm leading-relaxed mb-2">
                  {line || '\u00A0'}
                </p>
              ))}
            </div>

            {/* Scroll-to-bottom arrow */}
            <button
              onClick={scrollOfferToBottom}
              className="absolute bottom-24 right-6 w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition flex items-center justify-center hover:scale-110 active:scale-95"
              title="Pastga tushish"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleOfferAccept}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Check className="w-5 h-5" />
                Tushundim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterModal;
