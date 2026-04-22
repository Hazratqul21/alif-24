#!/usr/bin/env node
/**
 * Post-build static SEO pre-renderer.
 *
 * Reads dist/index.html and produces per-route HTML with unique
 * <title>, meta description/keywords, canonical, OG/Twitter tags and a
 * <noscript> content block so search engine crawlers see real content
 * even without executing JavaScript.
 *
 * Run: node scripts/prerender.mjs   (wired into `npm run build`)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const SITE = 'https://alif24.uz';

const routes = [
  {
    path: '/',
    title: "Alif24 — Bolalar uchun adaptiv ta'lim platformasi",
    description:
      "Alif24 — 5-11 yoshdagi bolalar uchun adaptiv ta'lim platformasi. Darslar, o'yinlar, olimpiadalar, AI testlar va harflar dunyosi bir joyda.",
    keywords:
      "alif24, bolalar ta'limi, onlayn darslar, o'quv o'yinlari, olimpiada, adaptiv ta'lim, uzbek maktabi",
    h1: "Alif24 — Bolalar uchun adaptiv ta'lim platformasi",
    body: [
      "Alif24 — O'zbekiston maktab yoshidagi bolalar uchun yagona ta'lim ekotizimi.",
      "Harflar, o'qish, matematika, mantiq va olimpiadalar — hammasi bitta platformada.",
      "Ota-onalar, o'qituvchilar va o'quvchilar uchun alohida panellar.",
    ],
  },
  {
    path: '/about',
    title: "Biz haqimizda — Alif24",
    description:
      "Alif24 — 4-11 yoshdagi bolalar uchun adaptiv ta'lim platformasi. Missiyamiz, jamoamiz, texnologiyalarimiz va platformamiz haqida batafsil ma'lumot.",
    keywords:
      "alif24 haqida, alif24 jamoasi, bolalar ta'limi O'zbekiston, adaptiv ta'lim, edtech O'zbekiston",
    h1: "Alif24 haqida",
    body: [
      "Alif24 — O'zbekistondagi bolalarga moʻljallangan zamonaviy ta'lim platformasi.",
      "Missiyamiz — har bir bolaga shaxsiylashtirilgan, sifatli va qiziqarli ta'lim berish.",
      "Platformamiz sun'iy intellekt va adaptiv algoritmlarga asoslangan.",
    ],
  },
  {
    path: '/partners',
    title: "Hamkorlar — Alif24",
    description:
      "Alif24 bilan hamkorlik — maktablar, o'quv markazlari, korxonalar va brendlar uchun maxsus imkoniyatlar. Hamkorlik shartlari va afzalliklari.",
    keywords:
      "alif24 hamkorlik, ta'lim hamkorlari, maktab hamkorligi, o'quv markazlari, edtech hamkorlik",
    h1: "Alif24 hamkorlari",
    body: [
      "Alif24 maktablar, o'quv markazlari va brendlar bilan strategik hamkorlik olib boradi.",
      "Hamkorlar maxsus chegirmalar, CRM integratsiyasi va birgalikda marketing imkoniyatlaridan foydalanadi.",
    ],
  },
  {
    path: '/privacy',
    title: "Maxfiylik siyosati — Alif24",
    description:
      "Alif24 platformasi maxfiylik siyosati — foydalanuvchi ma'lumotlarini to'plash, saqlash va himoyalash qoidalari.",
    keywords: "alif24 maxfiylik, maxfiylik siyosati, shaxsiy ma'lumotlar, alif24 privacy",
    h1: "Maxfiylik siyosati",
    body: [
      "Alif24 foydalanuvchi ma'lumotlarini O'zbekiston Respublikasi qonunlariga muvofiq himoya qiladi.",
      "Ma'lumotlar uchinchi tomonga berilmaydi va faqat xizmat ko'rsatish uchun ishlatiladi.",
    ],
  },
  {
    path: '/leaderboard',
    title: "Reyting — Eng yaxshi o'quvchilar — Alif24",
    description:
      "Alif24 platformasida haftalik, oylik va yillik eng yaxshi o'quvchilar reytingi. Ballar, Alif-tangalar va olimpiadalardagi yutuqlar.",
    keywords:
      "alif24 reyting, o'quvchilar reytingi, olimpiada reyting, ta'lim reytingi, top o'quvchilar",
    h1: "Alif24 reyting — eng yaxshi o'quvchilar",
    body: [
      "Alif24 reyting tizimi — o'quvchilarning haftalik, oylik va yillik yutuqlarini ko'rsatadi.",
      "Har bir bola o'z maqsadini qo'yishi va tengdoshlari orasida o'rnini ko'rishi mumkin.",
    ],
  },
  {
    path: '/smartkids',
    title: "SmartKids AI — Bolalar uchun matnni ovozga aylantirish — Alif24",
    description:
      "AI yordamida matnni tabiiy ovozga aylantiruvchi bolalarga mo'ljallangan o'qish vositasi. Uyda mustaqil o'qishni rivojlantiring.",
    keywords:
      "smartkids, bolalar AI, matnni ovozga aylantirish, TTS bolalar uchun, alif24 smartkids, o'qishni o'rganish",
    h1: "SmartKids AI — AI bilan o'qish",
    body: [
      "SmartKids AI — bolalar uchun matnni tabiiy o'zbek ovozida o'qib beradigan AI vositasi.",
      "Ota-onalarsiz ham mustaqil o'qish ko'nikmasini rivojlantiradi.",
    ],
  },
  {
    path: '/mathkids',
    title: "MathKids AI — Bolalar uchun matematika yordamchisi — Alif24",
    description:
      "Sun'iy intellekt yordamida matematik misollarni yechuvchi bolalar uchun AI yordamchi. Vazifalarni bosqichma-bosqich tushuntirib beradi.",
    keywords:
      "mathkids, bolalar matematika, AI matematika, misollar yechish, alif24 matematika, matematika yordamchi",
    h1: "MathKids AI — matematika yordamchisi",
    body: [
      "MathKids AI misollarni bosqichma-bosqich tushuntiradi.",
      "Bola ishni o'rganadi, shunchaki javobni ko'chirib olmaydi.",
    ],
  },
];

const notFoundRoute = {
  path: '/404',
  title: '404 — Sahifa topilmadi — Alif24',
  description: "Siz qidirayotgan sahifa topilmadi. Asosiy sahifaga qayting yoki boshqa bo'limga o'ting.",
  keywords: '404, sahifa topilmadi, alif24',
  h1: '404 — Sahifa topilmadi',
  body: ['Siz qidirayotgan sahifa topilmadi. Bosh sahifaga qaytib, boshqa boʻlimga oʻting.'],
  noindex: true,
};

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function renderRoute(route, indexHtml) {
  const canonical = `${SITE}${route.path === '/' ? '/' : route.path}`;
  let html = indexHtml;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${esc(route.description)}" />`,
  );
  html = html.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="keywords" content="${esc(route.keywords)}" />`,
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${esc(route.title)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${esc(route.description)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
  );

  if (route.noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    );
  }

  const crawlBlock = `
    <noscript>
      <h1>${esc(route.h1)}</h1>
      ${(route.body || []).map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <p>JavaScript yoqilmagan. <a href="${SITE}">Alif24 bosh sahifasi</a></p>
    </noscript>`;
  html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>${crawlBlock}`);

  return html;
}

async function main() {
  const indexPath = path.join(DIST, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf-8');

  let count = 0;
  for (const route of routes) {
    const html = renderRoute(route, indexHtml);
    if (route.path === '/') {
      await fs.writeFile(indexPath, html);
    } else {
      const dir = path.join(DIST, route.path);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'index.html'), html);
    }
    console.log(`  ✓ prerendered  ${route.path}`);
    count++;
  }

  const html404 = renderRoute(notFoundRoute, indexHtml);
  await fs.writeFile(path.join(DIST, '404.html'), html404);
  console.log(`  ✓ prerendered  /404.html (noindex)`);

  console.log(`\nPrerender complete: ${count} public routes + 404.html`);
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
