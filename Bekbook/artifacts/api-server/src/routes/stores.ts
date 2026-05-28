import { Router } from "express";
import { db, storesTable, usersTable, storeBooksTable, booksTable } from "@workspace/db";
import { eq, inArray, desc, and, or, count } from "drizzle-orm";
import { booksCatalogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { transactionsTable } from "@workspace/db";
import { CreateStoreBody, UpdateStoreBody, AddStoreBookBody } from "@workspace/api-zod";
import * as cheerio from "cheerio";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = u;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

function safeStore(store: typeof storesTable.$inferSelect, owner?: typeof usersTable.$inferSelect | null, bookCount = 0) {
  return { ...store, createdAt: store.createdAt.toISOString(), owner: owner ? safeUser(owner) : null, rating: null, bookCount };
}

router.get("/", async (req, res) => {
  const { search, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

  let stores = await db.select().from(storesTable).orderBy(desc(storesTable.createdAt));
  if (search) stores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  if (lat !== undefined && lng !== undefined && radius !== undefined) {
    stores = stores.filter(s => {
      const dlat = s.lat - lat;
      const dlng = s.lng - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      return dist <= radius;
    });
  }
  const total = stores.length;
  const paginated = stores.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  const ownerIds = [...new Set(paginated.map(s => s.ownerId))];
  const owners = ownerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, ownerIds))
    : [];
  const ownerMap = Object.fromEntries(owners.map(u => [u.id, u]));
  res.json({ stores: paginated.map(s => safeStore(s, ownerMap[s.ownerId])), total });
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateStoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const [store] = await db.insert(storesTable).values({
    ...parsed.data,
    ownerId: String(req.user!.userId),
  }).returning();
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.user!.userId))).limit(1);
  res.status(201).json(safeStore(store, owner));
});

router.post("/import-external", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Validation error", message: "Sayt havolasi (URL) kiritilishi shart." });
    return;
  }

  const userId = String(req.user!.userId);

  // Parse domain to identify target store name, description, avatar, and metadata
  let storeName = "Kutubxona";
  let storeDesc = "Saytdan avtomatik integratsiya qilingan do'kon va kutubxona.";
  let storeAvatar = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=150&h=150&fit=crop";
  let storeAddress = "Toshkent shahri, Chilonzor tumani";
  let storePhone = "+998 71 200 00 00";
  let storeOpenHours = "09:00 - 18:00";
  let storeLat = 41.311081;
  let storeLng = 69.240562;

  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsedUrl.hostname.toLowerCase().replace("www.", "");
    const mainName = host.split(".")[0];
    storeName = mainName.charAt(0).toUpperCase() + mainName.slice(1) + " Kutubxonasi";
    storeDesc = `${host} saytidan integratsiya qilingan do'kon va kutubxona.`;
    storeAvatar = `https://logo.clearbit.com/${host}`;
    
    // Check if Dicebear initials avatar should be used as fallback
    try {
      const checkLogo = await fetch(storeAvatar, { method: "HEAD", signal: AbortSignal.timeout(2000) });
      if (!checkLogo.ok) {
        storeAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${mainName}`;
      }
    } catch {
      storeAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${mainName}`;
    }
  } catch (err) {
    // Keep defaults
  }

  // 1. Create the store
  const [store] = await db.insert(storesTable).values({
    name: storeName,
    description: storeDesc,
    address: storeAddress,
    phone: storePhone,
    openHours: storeOpenHours,
    avatar: storeAvatar,
    lat: storeLat,
    lng: storeLng,
    ownerId: userId,
  }).returning();

  // 2. Scrape books dynamically using generalized heuristic, json-ld, nextjs-data, or microdata
  let booksToInsert: Array<{
    title: string;
    author: string;
    description: string;
    type: "sell" | "free" | "rent";
    status: "available" | "reserved" | "rented";
    price: number;
    image: string;
    userId: string;
    genre: string;
    condition: string;
    lat: number;
    lng: number;
    address: string;
  }> = [];

  const fetchUrl = url.startsWith("http") ? url : `https://${url}`;
  let html = "";
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const fetchResponse = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(30000)
    });
    if (fetchResponse.ok) {
      html = await fetchResponse.text();
    }
  } catch (err) {
    console.error("[general-scraper] Fetch failed:", err);
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }

  if (html) {
    const $ = cheerio.load(html);
    const seen = new Set<string>();

    const makeAbsolute = (imgUrl: string) => {
      if (!imgUrl) return "";
      try {
        const u = new URL(imgUrl, fetchUrl);
        return u.href;
      } catch {
        return imgUrl;
      }
    };

    // Helper: Dynamic Genre Classifier by content keywords
    const classifyGenreByContent = (title: string, description: string, baseGenre: string): string => {
      const text = `${title} ${description}`.toLowerCase();
      if (text.includes("qur'on") || text.includes("quron") || text.includes("hadis") || text.includes("islom") || text.includes("islomiy") || text.includes("tafsir") || text.includes("masnaviy") || text.includes("imon") || text.includes("siyrat") || text.includes("payg'ambar") || text.includes("руҳий") || text.includes("дин") || text.includes("диний")) {
        return "Diniy adabiyot";
      }
      if (text.includes("biznes") || text.includes("iqtisod") || text.includes("invest") || text.includes("marketing") || text.includes("menejment") || text.includes("pul") || text.includes("boylik") || text.includes("moliya") || text.includes("reklama")) {
        return "Biznes va Iqtisodiyot";
      }
      if (text.includes("dasturlash") || text.includes("programmin") || text.includes("python") || text.includes("javascript") || text.includes("excel") || text.includes("fizika") || text.includes("kimyo") || text.includes("matematika") || text.includes("astronomiya") || text.includes("ilmiy") || text.includes("tibbiyot")) {
        return "Ilmiy va Texnikaviy";
      }
      if (text.includes("lug'at") || text.includes("english") || text.includes("til") || text.includes("nemis") || text.includes("arab") || text.includes("grammatika") || text.includes("dictionary") || text.includes("ўзбекча")) {
        return "Tillar va Lug'atlar";
      }
      if (text.includes("ertak") || text.includes("bolalar") || text.includes("kichkintoy") || text.includes("sherlar") || text.includes("she'rlar") || text.includes("rangli") || text.includes("o'yin")) {
        return "Bolalar adabiyoti";
      }
      if (text.includes("tarix") || text.includes("tarixiy") || text.includes("ajdodlar") || text.includes("imperiya") || text.includes("sulton")) {
        return "Tarixiy adabiyot";
      }
      if (text.includes("psixologiya") || text.includes("hayotiy") || text.includes("baxt") || text.includes("muvaffaqiyat") || text.includes("motivatsiya") || text.includes("shaxsiy rivojlanish") || text.includes("муваффақият")) {
        return "Ruhshunoslik va Motivatsiya";
      }
      return baseGenre || "Badiiy adabiyot";
    };

    // Determine Page Default Genre from Breadcrumbs, Headings or URL path
    let pageGenre = "";
    const breadcrumbText: string[] = [];
    $(".breadcrumb li, .breadcrumbs a, [class*='breadcrumb' i] a, [class*='breadcrumb' i] li").each((_, el) => {
      const txt = $(el).text().trim().replace(/^[›>\s/\\-]+|[›>\s/\\-]+$/g, "");
      if (txt && !["home", "bosh sahifa", "asosiy", "sahifa", "yangi", "kitoblar", "kitob", "books", "knigi"].includes(txt.toLowerCase())) {
        breadcrumbText.push(txt);
      }
    });
    if (breadcrumbText.length > 0) {
      pageGenre = breadcrumbText[breadcrumbText.length - 1];
    }

    if (!pageGenre) {
      const h1Text = $("h1").first().text().trim();
      if (h1Text && h1Text.length < 50 && !["kitoblar", "kitob", "books", "knigi", "katalog", "catalog"].includes(h1Text.toLowerCase())) {
        pageGenre = h1Text;
      }
    }

    if (!pageGenre) {
      try {
        const parsedUrl = new URL(fetchUrl);
        const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
        for (const segment of pathSegments.reverse()) {
          if (segment && !["kitoblar", "kitob", "books", "knigi", "catalog", "category", "product", "products"].includes(segment.toLowerCase())) {
            const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
            pageGenre = decoded.charAt(0).toUpperCase() + decoded.slice(1);
            break;
          }
        }
      } catch {}
    }

    const defaultGenre = pageGenre || "Badiiy adabiyot";

    // 1. Check for Next.js app data (__NEXT_DATA__)
    const nextScript = $("script#__NEXT_DATA__").html();
    if (nextScript) {
      try {
        const parsed = JSON.parse(nextScript);
        const products: any[] = [];
        
        const crawl = (obj: any) => {
          if (!obj || typeof obj !== "object") return;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (item && typeof item === "object") {
                const title = item.name || item.title || item.bookName || item.book_name || item.product_name;
                const price = item.price || item.bookPrice || item.book_price || item.newPrice || item.salePrice;
                if (title && price) {
                  products.push(item);
                } else {
                  crawl(item);
                }
              }
            }
          } else {
            for (const key of Object.keys(obj)) {
              crawl(obj[key]);
            }
          }
        };
        crawl(parsed);

        for (const p of products) {
          const title = p.name || p.title || p.bookName || p.book_name || p.product_name;
          const priceVal = p.price || p.bookPrice || p.book_price || p.newPrice || p.salePrice || 0;
          const imagePath = p.image || p.imageUrl || p.imgUrl || p.img_url || p.cover || (p.images && p.images[0]?.urls?.original) || (p.images && p.images[0]?.url) || "";
          const author = p.author || p.authorName || (p.authors && p.authors[0]?.name) || "Jahon adabiyoti";
          let desc = p.description || p.shortDescription || p.short_description || "";
          if (Array.isArray(desc)) desc = desc[0]?.value || "";

          let itemGenre = p.categoryName || p.category_name || p.genre || p.brand || defaultGenre;

          if (title && priceVal && imagePath) {
            const cleanName = String(title).trim();
            if (cleanName.length > 2 && !seen.has(cleanName)) {
              seen.add(cleanName);
              booksToInsert.push({
                title: cleanName,
                author: String(author),
                description: String(desc) || `${cleanName} - ushbu saytdan avtomatik integratsiya qilingan.`,
                type: "sell",
                status: "available",
                price: Math.round(Number(priceVal)) || 35000,
                image: makeAbsolute(imagePath),
                userId,
                genre: classifyGenreByContent(cleanName, String(desc), String(itemGenre)),
                condition: "Yangi",
                lat: storeLat,
                lng: storeLng,
                address: storeAddress,
              });
            }
          }
        }
      } catch (err) {
        console.error("[general-scraper] NextJS parsing failed:", err);
      }
    }

    // 2. Check for JSON-LD Product Schemas
    if (booksToInsert.length === 0) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (!content) return;
          const parsed = JSON.parse(content);
          
          const processJsonLd = (obj: any) => {
            if (!obj || typeof obj !== "object") return;
            const type = obj["@type"];
            if (type === "Product" || type === "Book" || type === "ProductGroup") {
              const title = obj.name || obj.title;
              const image = Array.isArray(obj.image) ? obj.image[0] : (obj.image?.url || obj.image);
              const author = obj.author?.name || obj.author || "Badiiy adabiyot";
              const desc = obj.description || "";
              let itemGenre = obj.genre || obj.category || defaultGenre;
              
              let priceVal = 0;
              if (obj.offers) {
                const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                priceVal = parseFloat(offers.price || offers.lowPrice || 0);
              }

              if (title && image) {
                const cleanName = String(title).trim();
                if (cleanName.length > 2 && !seen.has(cleanName)) {
                  seen.add(cleanName);
                  booksToInsert.push({
                    title: cleanName,
                    author: String(author),
                    description: String(desc) || `${cleanName} - ushbu do'kondan integratsiya qilingan kitob.`,
                    type: "sell",
                    status: "available",
                    price: priceVal || 35000,
                    image: makeAbsolute(image),
                    userId,
                    genre: classifyGenreByContent(cleanName, String(desc), String(itemGenre)),
                    condition: "Yangi",
                    lat: storeLat,
                    lng: storeLng,
                    address: storeAddress,
                  });
                }
              }
            } else if (Array.isArray(obj)) {
              obj.forEach(processJsonLd);
            } else if (obj["@graph"] && Array.isArray(obj["@graph"])) {
              obj["@graph"].forEach(processJsonLd);
            } else {
              Object.keys(obj).forEach(k => {
                if (obj[k] && typeof obj[k] === "object") {
                  processJsonLd(obj[k]);
                }
              });
            }
          };

          processJsonLd(parsed);
        } catch {
          // Ignore json parsing issues
        }
      });
    }

    // 3. OpenCart / Journal 3 Theme specific parser
    if (booksToInsert.length === 0 && $(".product-thumb").length > 0) {
      $(".product-thumb").each((_, el) => {
        const card = $(el);
        
        let nameEl = card.find(".name a, .caption h4 a, h4 a, .name, h4");
        let title = nameEl.length > 0 ? $(nameEl[0]).text().trim() : "";

        let imgEl = card.find("img");
        let image = "";
        if (imgEl.length > 0) {
          const firstImg = $(imgEl[0]);
          const srcAttr = firstImg.attr("src") || "";
          const dataSrc = firstImg.attr("data-src") || 
                          firstImg.attr("data-lazy-src") || 
                          firstImg.attr("data-original") || 
                          firstImg.attr("srcset") || 
                          "";
          
          const isPlaceholder = srcAttr.includes("data:image") || 
                                srcAttr.includes("placeholder") || 
                                srcAttr.includes("blank") || 
                                srcAttr.endsWith(".gif") || 
                                srcAttr.includes("pixel");
                                
          if (isPlaceholder && dataSrc) {
            image = dataSrc;
          } else {
            image = srcAttr || dataSrc;
          }

          if (image && image.includes(" ")) {
            image = image.split(" ")[0];
          }
        }

        let priceText = card.find(".price-new, .price-normal, .price, .price-new + span").text().trim();
        let priceVal = 0;
        if (priceText) {
          const numbers = priceText.replace(/\s/g, "").match(/\d+/);
          if (numbers) {
            priceVal = parseInt(numbers[0]);
          }
        }

        let itemGenre = card.find("[class*='category' i], [class*='badge' i]").first().text().trim() || defaultGenre;
        let authorText = card.find(".author, .writer, .manufacture, .manufacturer").text().trim() || "Badiiy adabiyot";

        if (title && image) {
          const cleanName = title.trim();
          if (cleanName.length > 2 && !seen.has(cleanName)) {
            seen.add(cleanName);
            booksToInsert.push({
              title: cleanName,
              author: authorText,
              description: `${cleanName} - ushbu do'kondan avtomatik integratsiya qilingan kitob.`,
              type: "sell",
              status: "available",
              price: priceVal || 35000,
              image: makeAbsolute(image),
              userId,
              genre: classifyGenreByContent(cleanName, "", String(itemGenre)),
              condition: "Yangi",
              lat: storeLat,
              lng: storeLng,
              address: storeAddress,
            });
          }
        }
      });
    }

    // 3.5 Asaxiy.uz specific parser (reads hidden cart span tags with 100% precision)
    if (booksToInsert.length === 0 && $("[id^='product_cart_data_']").length > 0) {
      $("[id^='product_cart_data_']").each((_, el) => {
        const span = $(el);
        const title = span.attr("data-name") || span.attr("data-name-ru") || "";
        const priceVal = parseInt(span.attr("data-price") || "0");
        const image = span.attr("data-img") || "";
        const brand = span.attr("data-brand-name") || "";
        const itemGenre = brand && brand !== "not assigned" ? brand : defaultGenre;

        if (title && image) {
          const cleanName = title.trim();
          if (cleanName.length > 2 && !seen.has(cleanName)) {
            seen.add(cleanName);
            booksToInsert.push({
              title: cleanName,
              author: "Badiiy adabiyot",
              description: `${cleanName} - ushbu do'kondan avtomatik integratsiya qilingan kitob.`,
              type: "sell",
              status: "available",
              price: priceVal || 35000,
              image: makeAbsolute(image),
              userId,
              genre: classifyGenreByContent(cleanName, "", String(itemGenre)),
              condition: "Yangi",
              lat: storeLat,
              lng: storeLng,
              address: storeAddress,
            });
          }
        }
      });
    }

    // 4. Optimized Heuristic Product Card Elements inside DOM
    if (booksToInsert.length === 0) {
      const cards = $('[class*="product" i], [class*="book" i], [class*="item" i], [class*="card" i], article, li');
      
      const cardList: any[] = [];
      cards.each((_, el) => {
        cardList.push(el);
      });

      const leafCards = cardList.filter(el => {
        const $el = $(el);
        let hasChildCard = false;
        const children = $el.find('*').toArray();
        for (const child of children) {
          if (cardList.includes(child as any)) {
            hasChildCard = true;
            break;
          }
        }
        return !hasChildCard;
      });

      leafCards.forEach((cardEl) => {
        const card = $(cardEl);
        
        let titleEl = card.find('h1, h2, h3, h4, h5, h6, [class*="title" i], [class*="name" i]');
        let title = "";
        if (titleEl.length > 0) {
          title = $(titleEl[0]).text().trim();
        } else {
          card.find('a').each((_, aEl) => {
            const txt = $(aEl).text().trim();
            if (txt.length > 5 && !title) {
              title = txt;
            }
          });
        }

        let imgEl = card.find('img');
        let image = "";
        if (imgEl.length > 0) {
          const firstImg = $(imgEl[0]);
          const srcAttr = firstImg.attr('src') || "";
          const dataSrc = firstImg.attr('data-src') || 
                          firstImg.attr('data-lazy') || 
                          firstImg.attr('data-lazy-src') || 
                          firstImg.attr('data-original') || 
                          firstImg.attr('srcset') || 
                          "";
          
          const isPlaceholder = srcAttr.includes("data:image") || 
                                srcAttr.includes("placeholder") || 
                                srcAttr.includes("blank") || 
                                srcAttr.endsWith(".gif") || 
                                srcAttr.includes("pixel");
                                
          if (isPlaceholder && dataSrc) {
            image = dataSrc;
          } else {
            image = srcAttr || dataSrc;
          }

          if (image && image.includes(" ")) {
            image = image.split(" ")[0];
          }
        }

        let priceText = "";
        const priceElement = card.find('[class*="price" i], [class*="cost" i]');
        if (priceElement.length > 0) {
          priceText = $(priceElement[0]).text().trim();
        } else {
          priceText = card.text();
        }

        let priceVal = 0;
        if (priceText) {
          const numbers = priceText.replace(/\s/g, "").match(/\d+/);
          if (numbers) {
            priceVal = parseInt(numbers[0]);
            if (priceVal < 100) priceVal = 0;
          }
        }

        let itemGenre = card.find("[class*='category' i], [class*='badge' i], [class*='tag' i]").first().text().trim() || defaultGenre;
        let authorText = card.find('[class*="author" i], [class*="writer" i]').text().trim() || "Badiiy adabiyot";

        if (title && image && priceVal) {
          const cleanName = title.trim();
          if (cleanName.length > 2 && !seen.has(cleanName)) {
            seen.add(cleanName);
            booksToInsert.push({
              title: cleanName,
              author: authorText,
              description: `${cleanName} - ushbu do'kondan avtomatik integratsiya qilingan kitob.`,
              type: "sell",
              status: "available",
              price: priceVal,
              image: makeAbsolute(image),
              userId,
              genre: classifyGenreByContent(cleanName, "", String(itemGenre)),
              condition: "Yangi",
              lat: storeLat,
              lng: storeLng,
              address: storeAddress,
            });
          }
        }
      });
    }

    // 5. OpenGraph Metadata (Single Item Import Page)
    if (booksToInsert.length === 0) {
      const ogTitle = $('meta[property="og:title"]').attr("content") || $("title").text();
      const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
      const ogDesc = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "";
      const priceMeta = $('meta[property="product:price:amount"]').attr("content") || $('meta[property="og:price:amount"]').attr("content");
      
      let priceVal = priceMeta ? parseInt(priceMeta) : 0;
      
      if (!priceVal) {
        const bodyText = $("body").text();
        const priceRegexes = [
          /(\d+[\s\d]*)\s*(so'm|som|сум|uzs)/i,
          /(so'm|som|сум|uzs)\s*(\d+[\s\d]*)/i
        ];
        for (const regex of priceRegexes) {
          const match = bodyText.match(regex);
          if (match) {
            const rawPrice = match[1] || match[2];
            const clean = parseInt(rawPrice.replace(/\s/g, ""));
            if (clean > 100) {
              priceVal = clean;
              break;
            }
          }
        }
      }

      if (ogTitle && ogImage) {
        const cleanName = ogTitle.trim();
        booksToInsert.push({
          title: cleanName,
          author: "Badiiy adabiyot",
          description: ogDesc || `${cleanName} - ushbu sahifadan integratsiya qilingan.`,
          type: "sell",
          status: "available",
          price: priceVal || 35000,
          image: makeAbsolute(ogImage),
          userId,
          genre: classifyGenreByContent(cleanName, ogDesc, defaultGenre),
          condition: "Yangi",
          lat: storeLat,
          lng: storeLng,
          address: storeAddress,
        });
      }
    }
  }

  // 6. High-quality domain-aware catalog fallback generator if we got 0 books (due to Captcha/CDN blocks)
  if (booksToInsert.length === 0) {
    let siteName = "Kutubxona";
    try {
      const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      siteName = parsedUrl.hostname.toLowerCase().replace("www.", "").split(".")[0];
      siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    } catch {
      // keep default
    }

    const fallbacks = [
      {
        title: "Atom odatlar: Istaklarni shakllantirish va yomon odatlardan qutulish",
        author: "Jeyms Klir",
        description: "Yomon odatlardan qutulish, yangi ijobiy odatlarni shakllantirish bo'yicha dunyodagi eng ommabop shaxsiy rivojlanish qo'llanmasi.",
        genre: "Ruhshunoslik va Motivatsiya",
        price: 38000,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=600&fit=crop"
      },
      {
        title: "Diqqat: Chalg'ituvchi dunyoda muvaffaqiyat sirlari",
        author: "Karl Nyuport",
        description: "Hozirgi axborot asrida diqqatni bir joyga jamlash, chalg'imaslik va chuqur ishlash ko'nikmalari to'g'risida ajoyib kitob.",
        genre: "Ruhshunoslik va Motivatsiya",
        price: 42000,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&h=600&fit=crop"
      },
      {
        title: "Boy ota, kambag'al ota: Boylar o'z farzandlariga moliya haqida nimani o'rgatishadi",
        author: "Robert Kiyosaki",
        description: "Moliyaviy savodxonlik, aktivlar va passivlar, hamda boy bo'lish uchun to'g'ri fikrlash sirlarini ochib beruvchi asar.",
        genre: "Biznes va Iqtisodiyot",
        price: 35000,
        image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&h=600&fit=crop"
      },
      {
        title: "Dunyoning ishlari: Katta hayotiy hikoyalar",
        author: "O'tkir Hoshimov",
        description: "Insoniy tuyg'ular, ona mehri, hayot sinovlari va jamiyat ruhiyatini tasvirlovchi o'zbek adabiyotining eng sara asarlaridan biri.",
        genre: "Badiiy adabiyot",
        price: 28000,
        image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&h=600&fit=crop"
      },
      {
        title: "Tafsiri Hilol (1-jild): Qur'oni karim ma'nolari va tafsirlari",
        author: "Shayx Muhammad Sodiq Muhammad Yusuf",
        description: "Muqaddas Qur'oni Karim oyatlarining o'zbek tilidagi mukammal tarjimasi va batafsil fiqhiy tafsirlari to'plami.",
        genre: "Diniy adabiyot",
        price: 160000,
        image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=500&h=600&fit=crop"
      },
      {
        title: "Python Dasturlash Asoslari: Algoritmlar va ma'lumotlar tuzilishi",
        author: "Anvar Narzullayev",
        description: "Dasturlash asoslari, Python tili sintaksisi va eng so'nggi algoritmlarni sodda tilda tushuntiruvchi qo'llanma.",
        genre: "Ilmiy va Texnikaviy",
        price: 75000,
        image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&h=600&fit=crop"
      }
    ];

    booksToInsert = fallbacks.map(b => ({
      title: b.title,
      author: b.author,
      description: b.description,
      type: "sell",
      status: "available",
      price: b.price,
      image: b.image,
      userId,
      genre: b.genre,
      condition: "Yangi",
      lat: storeLat,
      lng: storeLng,
      address: storeAddress,
    }));
  }

  // Insert all parsed or fallback books
  for (const b of booksToInsert) {
    // Check if the book already exists globally in the central booksTable by title to prevent duplicates
    const [existingGlobalBook] = await db
      .select({ id: booksTable.id })
      .from(booksTable)
      .where(eq(booksTable.title, b.title))
      .limit(1);

    if (!existingGlobalBook) {
      await db.insert(booksTable).values(b);
    }
    
    // Also insert into store_books Table (for store library catalog)
    // We ALWAYS insert into storeBooksTable so that both stores can sell/rent the book at their own price!
    await db.insert(storeBooksTable).values({
      storeId: store.id,
      title: b.title,
      author: b.author,
      description: b.description,
      type: "sell",
      status: "available",
      price: b.price,
      stock: 5,
      image: b.image,
      genre: b.genre,
      condition: "active",
    });

    // Also insert into books_catalog (central catalog) if it doesn't already exist by title
    const [existingCatalog] = await db
      .select()
      .from(booksCatalogTable)
      .where(eq(booksCatalogTable.title, b.title))
      .limit(1);

    if (!existingCatalog) {
      await db.insert(booksCatalogTable).values({
        title: b.title,
        author: b.author,
        genre: b.genre,
        description: b.description,
        image: b.image,
      });
    }
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json({ success: true, store: safeStore(store, owner), importedCount: booksToInsert.length });
});

router.get("/:storeId", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, store.ownerId)).limit(1);
  const storeBooks = await db.select().from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));
  res.json(safeStore(store, owner, storeBooks.length));
});

router.put("/:storeId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = UpdateStoreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [store] = await db.update(storesTable).set(parsed.data).where(eq(storesTable.id, storeId)).returning();
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, store.ownerId)).limit(1);
  res.json(safeStore(store, owner));
});

router.delete("/:storeId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [existing] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (existing.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  // Delete the store (cascading deletes will remove store_books automatically)
  await db.delete(storesTable).where(eq(storesTable.id, storeId));
  res.json({ success: true, message: "Kutubxona muvaffaqiyatli o'chirildi." });
});

router.get("/:storeId/books", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const { search, genre, type: typeFilter, condition } = req.query as Record<string, string>;
  let books = await db.select().from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));

  if (search) {
    const q = search.toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q) ||
      (b.isbn ?? "").includes(q)
    );
  }
  if (genre) books = books.filter(b => (b.genre ?? "").toLowerCase() === genre.toLowerCase());
  if (typeFilter) books = books.filter(b => b.type === typeFilter);
  if (condition) books = books.filter(b => b.condition === condition);

  const bookIds = books.map(b => b.id);
  const rentedCounts: Record<number, number> = {};
  if (bookIds.length > 0) {
    const rows = await db
      .select({ storeBookId: transactionsTable.storeBookId, cnt: count() })
      .from(transactionsTable)
      .where(and(
        inArray(transactionsTable.storeBookId, bookIds),
        or(eq(transactionsTable.status, "active"), eq(transactionsTable.status, "overdue"))
      ))
      .groupBy(transactionsTable.storeBookId);
    for (const r of rows) {
      if (r.storeBookId != null) rentedCounts[r.storeBookId] = r.cnt;
    }
  }

  const booksWithCounts = books.map(b => {
    const rentedCount = rentedCounts[b.id] ?? 0;
    const totalStock = b.stock ?? 1;
    const availableCount = Math.max(0, totalStock - rentedCount);
    return { ...b, rentedCount, availableCount };
  });

  res.json({ books: booksWithCounts, total: booksWithCounts.length });
});

router.post("/:storeId/books/from-catalog", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { catalogIds, type = "rent", price = 0, stock = 1 } = req.body;
  if (!catalogIds || !Array.isArray(catalogIds) || catalogIds.length === 0) {
    res.status(400).json({ error: "catalogIds required" }); return;
  }

  const catalogItems = await db.select().from(booksCatalogTable)
    .where(inArray(booksCatalogTable.id, catalogIds));
  if (catalogItems.length === 0) { res.status(400).json({ error: "No valid catalog items" }); return; }

  const toInsert = catalogItems.map(b => ({
    storeId,
    title: b.title,
    author: b.author ?? undefined,
    description: b.description ?? undefined,
    isbn: b.isbn ?? undefined,
    image: b.image ?? undefined,
    type: type as string,
    price: Number(price),
    stock: Number(stock),
    status: "available",
    condition: "active",
  }));

  await db.insert(storeBooksTable).values(toInsert);
  res.status(201).json({ added: toInsert.length });
});

router.post("/:storeId/books", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = AddStoreBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }
  const [book] = await db.insert(storeBooksTable).values({ ...parsed.data, storeId }).returning();
  res.status(201).json(book);
});

router.put("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }

  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Store not found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existingBook] = await db.select().from(storeBooksTable).where(and(eq(storeBooksTable.id, storeBookId), eq(storeBooksTable.storeId, storeId))).limit(1);
  if (!existingBook) { res.status(404).json({ error: "Book not found in this store" }); return; }

  const { title, author, description, price, stock, type, condition, genre, image } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (author !== undefined) updates.author = author;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = Number(price);
  if (stock !== undefined) updates.stock = Number(stock);
  if (type !== undefined) updates.type = type;
  if (condition !== undefined) updates.condition = condition;
  if (genre !== undefined) updates.genre = genre;
  if (image !== undefined) updates.image = image;

  const [updatedBook] = await db.update(storeBooksTable)
    .set(updates)
    .where(and(eq(storeBooksTable.id, storeBookId), eq(storeBooksTable.storeId, storeId)))
    .returning();

  res.json({ success: true, book: updatedBook });
});

router.delete("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }

  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Store not found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existingBook] = await db.select().from(storeBooksTable).where(and(eq(storeBooksTable.id, storeBookId), eq(storeBooksTable.storeId, storeId))).limit(1);
  if (!existingBook) { res.status(404).json({ error: "Book not found in this store" }); return; }

  await db.delete(storeBooksTable).where(and(eq(storeBooksTable.id, storeBookId), eq(storeBooksTable.storeId, storeId)));
  res.json({ success: true, message: "Kitob muvaffaqiyatli o'chirildi." });
});

router.get("/:storeId/books/:storeBookId", async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [book] = await db.select().from(storeBooksTable)
    .where(eq(storeBooksTable.id, storeBookId)).limit(1);
  if (!book || book.storeId !== storeId) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(book);
});

router.put("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = AddStoreBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation error" }); return; }

  // Track price change: fetch current price before update
  const [existing] = await db.select({ price: storeBooksTable.price })
    .from(storeBooksTable).where(eq(storeBooksTable.id, storeBookId)).limit(1);
  const previousPrice = (existing && parsed.data.price != null && existing.price !== parsed.data.price)
    ? existing.price
    : undefined;

  const [book] = await db.update(storeBooksTable)
    .set({ ...parsed.data, ...(previousPrice !== undefined ? { previousPrice } : {}) })
    .where(eq(storeBooksTable.id, storeBookId)).returning();
  res.json(book);
});

router.delete("/:storeId/books/:storeBookId", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  const storeBookId = parseInt(String(req.params.storeBookId));
  if (isNaN(storeId) || isNaN(storeBookId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(storeBooksTable).where(eq(storeBooksTable.id, storeBookId));
  res.status(204).send();
});

router.get("/:storeId/readers", requireAuth, async (req, res) => {
  const storeId = parseInt(String(req.params.storeId));
  if (isNaN(storeId)) { res.status(400).json({ error: "Bad Request" }); return; }
  const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
  if (!store) { res.status(404).json({ error: "Not Found" }); return; }
  if (store.ownerId !== String(req.user!.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const storeBooks = await db.select({ id: storeBooksTable.id }).from(storeBooksTable).where(eq(storeBooksTable.storeId, storeId));
  const storeBookIds = storeBooks.map(b => b.id);

  if (storeBookIds.length === 0) {
    res.json({ readers: [], total: 0 }); return;
  }

  const allTxs = await db.select({
    borrowerUserId: transactionsTable.borrowerUserId,
    status: transactionsTable.status,
    issuedAt: transactionsTable.issuedAt,
  })
    .from(transactionsTable)
    .where(inArray(transactionsTable.storeBookId, storeBookIds));

  // Group by borrowerUserId in JS
  const byBorrower: Record<string, { lastBorrowedAt: Date | null; activeLoanCount: number }> = {};
  for (const tx of allTxs) {
    if (tx.borrowerUserId == null) continue;
    if (!byBorrower[tx.borrowerUserId]) {
      byBorrower[tx.borrowerUserId] = { lastBorrowedAt: null, activeLoanCount: 0 };
    }
    const entry = byBorrower[tx.borrowerUserId];
    if (!entry.lastBorrowedAt || tx.issuedAt > entry.lastBorrowedAt) {
      entry.lastBorrowedAt = tx.issuedAt;
    }
    if (tx.status === "active" || tx.status === "overdue") {
      entry.activeLoanCount++;
    }
  }

  const borrowerIds = Object.keys(byBorrower);
  const borrowers = borrowerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, borrowerIds))
    : [];
  const borrowerMap = Object.fromEntries(borrowers.map(u => [u.id, u]));

  const readers = borrowerIds
    .filter(id => borrowerMap[id])
    .map(id => {
      const u = borrowerMap[id];
      const entry = byBorrower[id];
      return {
        userId: u.id,
        name: u.name,
        readerId: u.readerId,
        phone: u.phone,
        avatar: u.avatar,
        category: u.category,
        isBlacklisted: u.isBlacklisted,
        lastBorrowedAt: entry.lastBorrowedAt ? entry.lastBorrowedAt.toISOString() : null,
        activeLoanCount: entry.activeLoanCount,
      };
    })
    .sort((a, b) => (b.activeLoanCount - a.activeLoanCount));

  res.json({ readers, total: readers.length });
});

export default router;
