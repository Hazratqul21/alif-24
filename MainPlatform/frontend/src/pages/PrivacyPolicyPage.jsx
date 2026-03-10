import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f0f1a] text-white/90 selection:bg-indigo-500/30">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f1a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="/Logo.png" alt="Alif24" className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-wide text-white">Alif24</span>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
                <div className="bg-[#151522] rounded-3xl border border-white/5 p-8 md:p-12 shadow-2xl">
                    <header className="mb-10 border-b border-white/10 pb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                            MAXFIYLIK SIYOSATI
                        </h1>
                        <p className="text-lg text-indigo-400 font-medium mb-2">
                            ALIF24 AI TEXNOLOGIES MCHJ
                        </p>
                        <p className="text-white/40 text-sm">
                            Oxirgi yangilangan sana: 2025-yil 4-mart
                        </p>
                    </header>

                    <article className="prose prose-invert prose-indigo max-w-none">
                        <div className="space-y-8 text-white/70 leading-relaxed">

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">Kirish</h2>
                                <p>
                                    <strong>ALIF24 AI TEXNOLOGIES MCHJ</strong> (keyingi o'rinlarda — "Biz", "Kompaniya", "Alif24") foydalanuvchilarning shaxsiy ma'lumotlari maxfiyligini hurmat qiladi hamda ularni himoya qilishga alohida e'tibor beradi.
                                </p>
                                <p className="mt-2">
                                    Ushbu Maxfiylik siyosati Alif24.uz veb-sayti va unga bog'liq mobil ilovalar (keyingi o'rinlarda — "Platforma") orqali qanday ma'lumotlar to'planishi, ulardan qanday foydalanilishi va qanday himoya qilinishi haqida ma'lumot beradi.
                                </p>
                                <p className="mt-2 text-white/90">
                                    Platformadan foydalanish orqali siz ushbu Maxfiylik siyosati shartlariga rozilik bildirasiz. Agar ushbu shartlarga rozi bo'lmasangiz, Platformadan foydalanmasligingizni so'raymiz.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">1. To'planadigan ma'lumotlar</h2>
                                <p>Biz quyidagi turdagi ma'lumotlarni to'plashimiz mumkin:</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">1.1. Shaxsiy ma'lumotlar</h3>
                                <p className="mb-2">Ro'yxatdan o'tish jarayonida:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Elektron pochta manzili yoki Telefon raqami</li>
                                    <li>Ism va familiya</li>
                                    <li>Parol (shifrlangan holda saqlanadi)</li>
                                </ul>

                                <p className="mb-2">Profil ma'lumotlari:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Foydalanuvchi taxallusi (nickname)</li>
                                    <li>Avatar rasmlari</li>
                                    <li>Yosh toifasi yoki tug'ilgan sana</li>
                                    <li>Ota-ona ma'lumotlari (agar foydalanuvchi voyaga yetmagan bo'lsa)</li>
                                </ul>
                                <p className="text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                    Biz faqat xizmat ko'rsatish uchun zarur bo'lgan minimal ma'lumotlarni yig'amiz.
                                </p>

                                <h3 className="text-lg font-semibold text-white/90 mt-6 mb-2">1.2. Foydalanish ma'lumotlari</h3>
                                <p className="mb-2">O'qish faoliyati:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Qaysi darslar, topshiriqlar yoki o'yinlar bajarilgani</li>
                                    <li>O'qish davomiyligi va vaqti</li>
                                    <li>Natijalar va statistik ko'rsatkichlar</li>
                                    <li>Test va olimpiada natijalari</li>
                                </ul>
                                <p className="mb-2">Platformadagi faollik:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Kirish va chiqish vaqtlari</li>
                                    <li>Ko'rilgan kontentlar ro'yxati</li>
                                    <li>Yuklab olingan materiallar</li>
                                    <li>Interaktiv mashqlar natijalari</li>
                                </ul>
                                <p className="text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                    Bu ma'lumotlar xizmat sifatini yaxshilash va AI tizimlarini takomillashtirish uchun ishlatiladi.
                                </p>

                                <h3 className="text-lg font-semibold text-white/90 mt-6 mb-2">1.3. Qurilma va texnik ma'lumotlar</h3>
                                <p className="mb-2">Avtomatik yig'iladigan ma'lumotlar:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Brauzer turi va versiyasi</li>
                                    <li>Operatsion tizim</li>
                                    <li>IP manzil (umumiy joylashuvni aniqlash uchun)</li>
                                    <li>Qurilma turi (mobil/kompyuter)</li>
                                    <li>Ekran o'lchamlari</li>
                                </ul>
                                <p className="mb-2">Cookie va mahalliy saqlash:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Sessiya cookie-fayllari (kirishni saqlash uchun)</li>
                                    <li>Mahalliy saqlash (localStorage) ma'lumotlari: Foydalanuvchi sozlamalari, Muzlatilgan sessiya ma'lumotlari, Foydalanish statistikasi</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-6 mb-2">1.4. Mehmon foydalanuvchilarni kuzatish</h3>
                                <p className="mb-2">Ro'yxatdan o'tmagan foydalanuvchilar uchun:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Brauzer barmog'i (fingerprint) — qurilmani aniqlash uchun</li>
                                    <li>Mehmon sessiya tokenlari</li>
                                    <li>Kontentga kirishlar soni</li>
                                    <li>Foydalanish tartibi</li>
                                </ul>
                                <p className="text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                    Bu ma'lumotlar ro'yxatdan o'tishga undash va xizmatni yaxshilash uchun ishlatiladi.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">2. Ma'lumotlardan foydalanish maqsadlari</h2>
                                <p className="mb-3">Ma'lumotlar quyidagi maqsadlarda ishlatiladi:</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">2.1. Asosiy xizmatlar</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Platformani taqdim etish va boshqarish</li>
                                    <li>AI asosidagi o'qitish tizimini ishlashini ta'minlash</li>
                                    <li>Foydalanuvchi profilini boshqarish</li>
                                    <li>Shaxsiylashtirilgan kontent taklif qilish</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">2.2. Xizmat sifatini yaxshilash</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Foydalanuvchi tajribasini yaxshilash</li>
                                    <li>Texnik nosozliklarni bartaraf etish</li>
                                    <li>Yangi funksiyalar ishlab chiqish</li>
                                    <li>AI modellarini o'qitish va takomillashtirish</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">2.3. Xavfsizlik va qonuniy talablar</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Platforma xavfsizligini ta'minlash</li>
                                    <li>Firibgarlik va noto'g'ri foydalanishni oldini olish</li>
                                    <li>Qonuniy majburiyatlarni bajarish</li>
                                    <li>Rasmiy organlar so'rovlari bo'yicha ma'lumot berish</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">3. Ma'lumotlarni uchinchi shaxslarga berish</h2>
                                <p className="font-medium text-white/90 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 mb-4 inline-block">Biz ma'lumotlarni sotmaymiz va ijaraga bermaymiz.</p>
                                <p className="mb-3">Ma'lumotlar quyidagi hollarda berilishi mumkin:</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">3.1. Texnik xizmat ko'rsatuvchi hamkorlar</h3>
                                <ul className="list-disc pl-5 mb-2 space-y-1">
                                    <li>Hosting provayderlari</li>
                                    <li>Server xizmatlari</li>
                                    <li>Email xizmatlari</li>
                                    <li>Cloud xizmatlari (masalan, Vercel, AWS)</li>
                                </ul>
                                <p className="text-sm text-indigo-300 mb-4">Barcha hamkorlar ma'lumotlarni maxfiy saqlash majburiyatini oladi.</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">3.2. Qonun talablari bo'yicha</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Sud qarorlari asosida</li>
                                    <li>Davlat organlarining rasmiy talabi bilan</li>
                                    <li>Milliy xavfsizlik yoki jamoat xavfsizligi uchun</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">3.3. Foydalanuvchi roziligi bilan</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Aniq rozilik asosida</li>
                                    <li>Ota-ona roziligi bilan (voyaga yetmaganlar uchun)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">4. Ma'lumotlarni saqlash va o'chirish</h2>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">4.1. Saqlash muddatlari</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-2">
                                    <li><strong>Hisob faol bo'lgan davrda:</strong> Zarur ma'lumotlar saqlanadi</li>
                                    <li><strong>Hisob o'chirilgach:</strong> Shaxsiy ma'lumotlar 30 kun ichida o'chiriladi</li>
                                    <li><strong>Statistik ma'lumotlar:</strong> Anonimlashtirilgan holda cheksiz saqlanishi mumkin</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-6 mb-2">4.2. Ma'lumotlarni o'chirish tartibi</h3>
                                <p className="mb-2">Ma'lumotlarni o'chirish uchun:</p>
                                <ul className="list-disc pl-5 mb-3 space-y-1">
                                    <li>Profildagi "Hisobni o'chirish" tugmasini bosing</li>
                                    <li>Yoki email orqali murojaat qiling: <a href="mailto:privacy@alif24.uz" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">privacy@alif24.uz</a></li>
                                </ul>
                                <p className="text-sm text-orange-400 font-medium">O'chirish jarayoni 7 kun ichida amalga oshiriladi.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">5. Ma'lumotlarni himoya qilish choralari</h2>
                                <p className="mb-3">ALIF24 AI TEXNOLOGIES MCHJ quyidagi choralarni ko'radi:</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">5.1. Texnik himoya</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-2">
                                    <li><strong>SSL/TLS shifrlash</strong> — barcha ma'lumotlar shifrlangan kanal orqali uzatiladi</li>
                                    <li><strong>HttpOnly cookie-fayllar</strong> — tokenlar xavfsiz saqlanadi</li>
                                    <li><strong>Himoyalangan server infratuzilmasi</strong> — zamonaviy xavfsizlik standartlari</li>
                                    <li><strong>Muntazam xavfsizlik auditlari</strong> — tizim zaifliklarini tekshirish</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-6 mb-2">5.2. Tashkiliy choralalar</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-2">
                                    <li><strong>Kirish huquqini cheklash</strong> — faqat ruxsat etilgan xodimlar</li>
                                    <li><strong>Xodimlarni maxfiylik bo'yicha o'qitish</strong> — muntazam treninglar</li>
                                    <li><strong>Maxfiylik shartnomalari</strong> — barcha xodimlar bilan</li>
                                </ul>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mt-4">
                                    <p className="text-yellow-200/90 text-sm">
                                        <strong>Eslatma:</strong> Internet orqali uzatiladigan ma'lumotlar 100% kafolatli xavfsiz bo'la olmaydi, ammo biz maksimal himoya choralarini ko'ramiz.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">6. Xavfsizlik buzilishi holatida</h2>
                                <p className="mb-2">Agar ma'lumotlar xavfsizligi buzilsa:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>72 soat ichida foydalanuvchilarga xabar beriladi</li>
                                    <li>To'liq tekshiruv o'tkaziladi</li>
                                    <li>Zarur hollarda tegishli organlarga xabar beriladi</li>
                                    <li>Qo'shimcha himoya choralari joriy qilinadi</li>
                                    <li>Barcha jabrlangan foydalanuvchilarga yordam ko'rsatiladi</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">7. Bolalar maxfiyligi</h2>
                                <p className="mb-3">Platforma bolalar uchun mo'ljallangan bo'lishi mumkin.</p>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">7.1. Voyaga yetmagan foydalanuvchilar</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>13 yoshgacha bo'lganlar uchun ota-ona roziligi talab qilinadi</li>
                                    <li>Minimal ma'lumot yig'iladi — faqat kerakli ma'lumotlar</li>
                                    <li>Ota-ona nazorati — hisobni boshqarish huquqi</li>
                                    <li>Kontent moderatsiyasi — yoshga mos kontent</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">7.2. Ota-ona huquqlari</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Bolaning profilini ko'rish va boshqarish</li>
                                    <li>Ma'lumotlarni o'chirishni so'rash</li>
                                    <li>Faoliyat hisobotlarini olish</li>
                                    <li>Hisobni to'xtatish yoki o'chirish</li>
                                </ul>
                                <p className="text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                    Agar ota-ona ruxsatisiz ma'lumot kiritilganini aniqlasangiz, biz bilan bog'laning.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">8. Foydalanuvchi huquqlari</h2>
                                <p className="mb-3">Siz quyidagi huquqlarga egasiz:</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.1. Ma'lumotlarga kirish</h3>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            <li>O'zingiz haqingizdagi barcha ma'lumotlarni ko'rish</li>
                                            <li>Ma'lumotlarning manbasini bilish</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.2. Tuzatish</h3>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            <li>Noto'g'ri ma'lumotlarni tuzatish</li>
                                            <li>Ma'lumotlarni yangilash</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.3. O'chirish</h3>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            <li>Hisobni o'chirish</li>
                                            <li>Ma'lumotlarni butunlay yo'q qilishni talab qilish</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.4. Qayta ishlashni cheklash</h3>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            <li>Ma'lumotlardan foydalanishni cheklash</li>
                                            <li>Marketing maqsadlarida foydalanishni to'xtatish</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.5. Ko'chirish</h3>
                                        <p className="text-sm">Ma'lumotlarni boshqa platformaga ko'chirib olish</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-white/90 font-semibold mb-2">8.6. E'tiroz bildirish</h3>
                                        <p className="text-sm">Qonunga zid bo'lgan qayta ishlashga e'tiroz</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-sm font-medium">
                                    <span className="text-white/90">So'rov uchun: <a href="mailto:privacy@alif24.uz" className="text-indigo-400">privacy@alif24.uz</a></span>
                                    <span className="text-white/50">|</span>
                                    <span className="text-white/90">Javob berish muddati: 30 kun</span>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">9. Cookie-fayllar va mahalliy saqlash</h2>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">9.1. Cookie-fayllar</h3>
                                <p className="mb-2">Platforma quyidagi cookie-fayllardan foydalanadi:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li><strong>Sessiya cookie-lari</strong> — kirishni saqlash</li>
                                    <li><strong>Xavfsizlik cookie-lari</strong> — himoya uchun</li>
                                    <li><strong>Analitika cookie-lari</strong> — foydalanishni tahlil qilish</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">9.2. Mahalliy saqlash (localStorage)</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>Foydalanuvchi sozlamalari</li>
                                    <li>Muzlatilgan ma'lumotlar</li>
                                    <li>Foydalanish statistikasi</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">9.3. Boshqarish</h3>
                                <p className="mb-2">Brauzer sozlamalari orqali cookie-fayllarni boshqarishingiz mumkin:</p>
                                <ul className="list-disc pl-5 mb-3 space-y-1">
                                    <li>Cookie-larni o'chirish</li>
                                    <li>Yangi cookie-larni rad etish</li>
                                    <li>Faqat kerakli cookie-larni ruxsat etish</li>
                                </ul>
                                <p className="text-sm text-yellow-400/80">Eslatma: Cookie-larni o'chirish ayrim funksiyalarga ta'sir qilishi mumkin.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">10. Xalqaro ma'lumotlarni uzatish</h2>
                                <p className="mb-2">Asosan, barcha ma'lumotlar <strong>O'zbekiston</strong> hududida saqlanadi.</p>
                                <p className="mb-2">Agar ma'lumotlar chet elga uzatilsa:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Faqat ishonchli hamkorlarga</li>
                                    <li>Xavfsizlik standartlariga rioya qilgan holda</li>
                                    <li>Qonun talablariga muvofiq</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">11. Siyosatga o'zgartirishlar</h2>
                                <p className="mb-2">Biz siyosatni yangilashimiz mumkin:</p>
                                <ul className="list-disc pl-5 mb-3 space-y-1">
                                    <li>Yangilangan sana har doim ko'rsatiladi</li>
                                    <li>Muhim o'zgarishlar haqida 30 kun oldin email orqali xabar beriladi</li>
                                    <li>Kichik o'zgarishlar veb-saytda e'lon qilinadi</li>
                                </ul>
                                <p className="text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                    O'zgarishlar kuchga kirgunga qadar eski siyosat qo'llaniladi.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">12. Biz bilan bog'lanish</h2>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">12.1. Maxfiylik bo'yicha mas'ul shaxs</h3>
                                <div className="bg-white/5 p-5 rounded-xl border border-white/10 mb-4 inline-block w-full md:w-auto">
                                    <p className="font-bold text-white mb-3">ALIF24 AI TEXNOLOGIES MCHJ</p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2"><span className="text-white/50 w-16">Email:</span> <a href="mailto:privacy@alif24.uz" className="text-indigo-400 hover:text-indigo-300">privacy@alif24.uz</a></li>
                                        <li className="flex items-center gap-2"><span className="text-white/50 w-16">Telefon:</span> <a href="tel:+998908278358" className="text-white/90 hover:text-white">+998 90 827 83 58</a></li>
                                        <li className="flex items-center gap-2"><span className="text-white/50 w-16">Manzil:</span> <span className="text-white/90">O'zbekiston Respublikasi, Toshkent shahri</span></li>
                                    </ul>
                                </div>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">12.2. Umumiy bog'lanish</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Asosiy veb-sayt: <a href="https://alif24.uz" className="text-indigo-400 hover:text-indigo-300">https://alif24.uz</a></li>
                                    <li>Texnik yordam: <a href="mailto:support@alif24.uz" className="text-indigo-400 hover:text-indigo-300">support@alif24.uz</a></li>
                                    <li>Ijtimoiy tarmoqlar: Platformada ko'rsatilgan</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">13. Qo'shimcha ma'lumotlar</h2>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">13.1. Qonun asoslari</h3>
                                <p className="mb-2">Ushbu siyosat O'zbekiston Respublikasining quyidagi qonunlariga asoslanadi:</p>
                                <ul className="list-disc pl-5 mb-4 space-y-1">
                                    <li>"Shaxsiy ma'lumotlar to'g'risida"gi Qonun</li>
                                    <li>"Axborotlashtirish to'g'risida"gi Qonun</li>
                                    <li>"Elektron tijorat to'g'risida"gi Qonun</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">13.2. Ta'riflar</h3>
                                <ul className="list-disc pl-5 mb-4 space-y-2">
                                    <li><strong>Shaxsiy ma'lumotlar</strong> — identifikatsiya qilish mumkin bo'lgan har qanday ma'lumot</li>
                                    <li><strong>Qayta ishlash</strong> — ma'lumotlarni yig'ish, saqlash, foydalanish, uzatish</li>
                                    <li><strong>Foydalanuvchi</strong> — platformadan foydalanuvchi jismoniy shaxs</li>
                                    <li><strong>Operator</strong> — ma'lumotlarni qayta ishlovchi kompaniya</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">13.3. Huquqiy majburiyat</h3>
                                <p className="text-indigo-200">
                                    ALIF24 AI TEXNOLOGIES MCHJ foydalanuvchilarning ishonchini qadrlaydi va shaxsiy ma'lumotlarni qonunga muvofiq qayta ishlaydi.
                                </p>
                            </section>

                            <div className="mt-12 pt-8 border-t border-white/10 text-center">
                                <h3 className="text-xl font-bold text-white mb-6">Yakuniy qoidalar</h3>
                                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-sm font-medium mb-8">
                                    <span className="bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20">Maxfiylik — ustuvorimiz</span>
                                    <span className="bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20">Huquqlar hurmat qilinadi</span>
                                    <span className="bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20">Shaffof jarayonlar</span>
                                    <span className="bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20">Doimiy xavfsizlik</span>
                                    <span className="bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20">Doimiy takomillashtirish</span>
                                </div>
                                <p className="text-white/60 mb-8 max-w-2xl mx-auto">
                                    Ushbu Maxfiylik siyosati ALIF24 AI TEXNOLOGIES MCHJ tomonidan ishlab chiqilgan va qonun talablariga to'liq mos keladi.
                                </p>
                                <p className="text-white/40 text-sm">
                                    &copy; {new Date().getFullYear()} ALIF24 AI TEXNOLOGIES MCHJ. Barcha huquqlar himoyalangan.
                                </p>
                            </div>

                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;
