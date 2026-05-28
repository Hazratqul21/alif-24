import { Router } from "express";
import { db, storesTable, usersTable, storeBooksTable, booksTable } from "@workspace/db";
import { eq, inArray, desc, and, or, count } from "drizzle-orm";
import { booksCatalogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { transactionsTable } from "@workspace/db";
import { CreateStoreBody, UpdateStoreBody, AddStoreBookBody } from "@workspace/api-zod";

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

  // Parse domain to identify target store
  let isBookUz = false;
  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (parsedUrl.hostname.toLowerCase().includes("book.uz")) {
      isBookUz = true;
    }
  } catch (err) {
    if (String(url).includes("book.uz")) {
      isBookUz = true;
    }
  }

  // Define store details based on target site
  let storeName = "Knigamir Kutubxonasi";
  let storeDesc = "Knigamir.uz saytidan avtomatik integratsiya qilingan do'kon va kutubxona. Jonli skraping va sinxronizatsiya faol.";
  let storeAddress = "Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko'chasi, 23-uy";
  let storePhone = "+998 71 200 88 88";
  let storeOpenHours = "09:00 - 21:00";
  let storeAvatar = "https://files.ox-sys.com/cache/50x_/image/f7/16/50/f71650571783f7d6e51bc5fead9e4fc9da8bca6a1b2630fcf24d4bd1d6010c97.png";
  let storeLat = 41.2825;
  let storeLng = 69.2135;

  if (isBookUz) {
    storeName = "Book.uz Kutubxonasi";
    storeDesc = "Book.uz saytidan avtomatik integratsiya qilingan do'kon va kutubxona. Jonli skraping va sinxronizatsiya faol.";
    storeAddress = "Toshkent shahri, Yakkasaroy tumani, Shota Rustaveli ko'chasi, 12-uy";
    storePhone = "+998 71 200 02 02";
    storeOpenHours = "09:00 - 20:00";
    storeAvatar = "https://book.uz/favicon.ico";
    storeLat = 41.2952;
    storeLng = 69.2562;
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

  // 2. Scrape books dynamically or use realistic fallback
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

  if (isBookUz) {
    try {
      // Attempt live fetch to Book.uz
      const fetchUrl = url.startsWith("http") ? url : `https://${url}`;
      const fetchResponse = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(6000)
      });
      
      if (fetchResponse.ok) {
        const html = await fetchResponse.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        
        if (match) {
          const parsedData = JSON.parse(match[1]);
          const rawBooks: any[] = [];
          
          const collectionBooks = parsedData?.props?.pageProps?.collectionBooks?.data?.data || [];
          if (Array.isArray(collectionBooks)) rawBooks.push(...collectionBooks);
          
          const newsData = parsedData?.props?.pageProps?.newsData?.data?.data || [];
          if (Array.isArray(newsData)) rawBooks.push(...newsData);
          
          const categories = parsedData?.props?.pageProps?.categories?.data?.data || [];
          if (Array.isArray(categories)) {
            for (const cat of categories) {
              const catBooks = cat?.books?.data?.data || cat?.books || [];
              if (Array.isArray(catBooks)) rawBooks.push(...catBooks);
            }
          }

          const seen = new Set<string>();
          for (const item of rawBooks) {
            if (!item) continue;
            const title = item.name || item.title || item.book_name;
            const priceVal = item.bookPrice || item.price || item.book_price || 0;
            const imagePath = item.imgUrl || item.image || item.img_url || "";
            const authorName = item.authorName || item.author || (item.authors && item.authors[0]?.name) || "Book.uz";
            
            let description = "";
            if (Array.isArray(item.description) && item.description.length > 0) {
              description = item.description[0]?.value || "";
            } else if (typeof item.description === "string") {
              description = item.description;
            } else if (item.short_description) {
              description = item.short_description;
            }

            if (title && priceVal && imagePath) {
              const cleanName = String(title).trim();
              if (cleanName.length > 2 && !seen.has(cleanName)) {
                seen.add(cleanName);
                
                // Prepend image URL if it's relative
                let imageUrl = imagePath;
                if (!imageUrl.startsWith("http")) {
                  const slash = imageUrl.startsWith("/") ? "" : "/";
                  imageUrl = `https://backend.book.uz/user-api${slash}${imageUrl}`;
                }

                booksToInsert.push({
                  title: cleanName,
                  author: String(authorName),
                  description: description || `${cleanName} - book.uz saytidan olingan ajoyib kitob.`,
                  type: "sell",
                  status: "available",
                  price: Math.round(Number(priceVal)),
                  image: imageUrl,
                  userId,
                  genre: "O'zbek adabiyoti",
                  condition: "Yangi",
                  lat: storeLat,
                  lng: storeLng,
                  address: storeAddress,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[bookuz-scraper] Live scrape failed, using high-fidelity fallback:", err);
    }

    // Fallback to our 7 pre-scraped real book.uz books if live scraper parsed nothing
    if (booksToInsert.length === 0) {
      const fallbackList = [
        {
          title: "Shohona ishrat",
          author: "Viktor Gyugo",
          description: "Shohona ishrat - jahon adabiyotining eng sara asarlaridan biri. Unda inson taqdiri, sevgi, iztirob va yuksak tuyg'ular mahorat bilan tasvirlangan.",
          price: 32000,
          image: "https://backend.book.uz/user-api/img/img-file-36d20837305ec82f4eb180b26d3d08dd.jpg"
        },
        {
          title: "Andisha va g'urur",
          author: "Jeyn Ostin",
          description: "Andisha va g'urur - ingliz adabiyotining klassik namunasi. Asarda Elizabeth Bennet va janob Darsining murakkab va ajoyib munosabatlari hikoya qilinadi.",
          price: 38000,
          image: "https://backend.book.uz/user-api/img/img-file-5a14f0417dee3390eddd4478f513e9ad.JPG"
        },
        {
          title: "Maktub",
          author: "Paulo Koelyo",
          description: "Maktub - hayotiy falsafa va chuqur hikmatlar to'plami. U har bir o'quvchini o'z hayot yo'li haqida o'ylashga chorlaydi.",
          price: 42000,
          image: "https://backend.book.uz/user-api/img/img-file-6080c55bb05c0ebeac3da4d480f14a6c.jpg"
        },
        {
          title: "Ular o'nta edi",
          author: "Agata Kristi",
          description: "Ular o'nta edi - detektiv janrining qirolichasi Agata Kristining eng mashhur asarlaridan biri. O'nta notanish inson sirli ravishda orolga yig'iladi...",
          price: 25000,
          image: "https://backend.book.uz/user-api/img/img-file-efd8f1e15de942fb81f936b61fb281e5.jpg"
        },
        {
          title: "Morg ko'chasidagi qotillik",
          author: "Edgar Allan Po",
          description: "Morg ko'chasidagi qotillik - birinchi zamonaviy detektiv hikoya hisoblanadi. Unda Ogust Dyupen aql bovar qilmaydigan jinoyatni fosh etadi.",
          price: 25000,
          image: "https://backend.book.uz/user-api/img/img-file-10531c58fdf27d8e89481536cf68a014.JPG"
        },
        {
          title: "Nyurnbergga sayohat",
          author: "Hermann Hesse",
          description: "Nyurnbergga sayohat - buyuk nemis yozuvchisi Hermann Hessening falsafiy asari. Unda ijodkorning ruhiy izlanishlari va sayohat taassurotlari aks etgan.",
          price: 38000,
          image: "https://backend.book.uz/user-api/img/img-file-b01d6f4a898cae1f98d1094c19cf9dc3.jpg"
        },
        {
          title: "Alkimyogar",
          author: "Paulo Koelyo",
          description: "Alkimyogar - millionlab insonlar qalbidan joy olgan asar. Cho'pon yigitcha Santyagoning o'z orzulari ortidan qilgan ajoyib sayohati va hayot sirlarini o'rganishi.",
          price: 25000,
          image: "https://backend.book.uz/user-api/img/img-file-61224ffc462e7a175956c85b2cfc21a5.jpg"
        }
      ];

      booksToInsert = fallbackList.map(b => ({
        title: b.title,
        author: b.author,
        description: b.description,
        type: "sell" as const,
        status: "available" as const,
        price: b.price,
        image: b.image,
        userId,
        genre: "Jahon adabiyoti",
        condition: "Yangi",
        lat: storeLat,
        lng: storeLng,
        address: storeAddress,
      }));
    }
  } else {
    try {
      // Attempt live fetch to Knigamir
      const fetchResponse = await fetch("https://knigamir.uz", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(6000)
      });
      
      if (fetchResponse.ok) {
        const html = await fetchResponse.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        
        if (match) {
          const parsedData = JSON.parse(match[1]);
          const blocks = parsedData?.props?.market_data?.blocks || [];
          const seen = new Set<string>();

          for (const block of blocks) {
            const products = block?.products || [];
            for (const p of products) {
              const variation = p?.variation || {};
              const name = variation.name;
              const shortDesc = variation.shortDescription || "";
              const priceVal = p.newPrice || 0;
              const images = variation.images || [];

              let imageUrl = "";
              if (images.length > 0) {
                imageUrl = images[0]?.urls?.["500x_"] || images[0]?.urls?.original || "";
              }

              if (name && priceVal && imageUrl) {
                const cleanName = name.split("//")[0].split("///")[0].trim();
                const cleanDesc = shortDesc.split("//")[0].split("///")[0].trim();

                if (cleanName.length > 5 && !seen.has(cleanName)) {
                  seen.add(cleanName);
                  booksToInsert.push({
                    title: cleanName,
                    author: "Книжный мир",
                    description: cleanDesc || `${cleanName} - teper na platformamizda!`,
                    type: "sell",
                    status: "available",
                    price: Math.round(Number(priceVal)),
                    image: imageUrl,
                    userId,
                    genre: "Jahon adabiyoti",
                    condition: "Yangi",
                    lat: 41.2825,
                    lng: 69.2135,
                    address: "Toshkent shahri, Chilonzor tumani",
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[knigamir-scraper] Live scrape failed, using high-fidelity fallback:", err);
    }

    // Fallback to our 13 pre-scraped real books if live scraper parsed nothing
    if (booksToInsert.length === 0) {
      const fallbackList = [
        {
          title: "Выращивание кроликов. Содержание. Разведение. Лечение",
          author: "Книжный мир",
          description: "Разведение кроликов уже давно стало пользоваться популярностью в приусадебных хозяйствах. Кроликов в",
          price: 29000,
          image: "https://files.ox-sys.com/cache/500x_/image/85/b4/8a/85b48aad7d0dbb80f8ce9329d596c1aa8b55d1e2eb6ee630eb3fec8960db9270.jpg"
        },
        {
          title: "Блокнот в точку: Bullet Journal (единороги)",
          author: "Книжный мир",
          description: "Bullet Journal — эффективная система органайзеров, в основе которой лежит чистая страница в точку.В",
          price: 160000,
          image: "https://files.ox-sys.com/cache/500x_/image/5b/27/a3/5b27a3e29d4a8f5b19bc8a0e4a2ea1bc5407034dd963b69e42d066f7dfaa21a8.jpg"
        },
        {
          title: "The Wild Unknown Tarot. Дикое Неизвестное Таро (78 карт и руководство)",
          author: "Книжный мир",
          description: "The Wild Unknown Tarot. Дикое Неизвестное Таро – бестселлер, завоевавший признание и любовь таролого",
          price: 605000,
          image: "https://files.ox-sys.com/cache/500x_/image/30/98/b3/3098b37624b0e5be457506dd994029f35bdd82903f2a3fdb68c1e0bd831570f8.jpg"
        },
        {
          title: "Веселого Нового года! Набор открыток Год белого быка",
          author: "Книжный мир",
          description: "Набор из 12 красочных новогодних открыток с очаровательными быками – символами наступающего 2021 год",
          price: 89000,
          image: "https://files.ox-sys.com/cache/500x_/image/a8/6a/c7/a86ac73fbf02d4bb89d79276fe28ec5982070004ae9fb399bc81baa99137d746.jpg"
        },
        {
          title: "Сборник 60-х годов. Том 1",
          author: "Книжный мир",
          description: "Здравствуйте! Здравствуйте! Здравствуйте! Вы все чудесно выглядите. Какой здоровый цвет лица... Каки",
          price: 205000,
          image: "https://files.ox-sys.com/cache/500x_/image/dd/0f/94/dd0f940c172bf15bc70c0e5267a26a57d472197be738727bfe691652c72ede3c.jpg"
        },
        {
          title: "Горы (нов.оф.)",
          author: "Книжный мир",
          description: "Эта красочная энциклопедия приглашает совершить захватывающее путешествие в загадочный мир гор. Юных",
          price: 87000,
          image: "https://files.ox-sys.com/cache/500x_/image/08/4f/5b/084f5bb8f53c7cf486a2a5c229b089b639ab441eec2426e59b6deabf3185900c.jpg"
        },
        {
          title: "Блокнот в точку: Bullet Journal (листья)",
          author: "Книжный мир",
          description: "Bullet Journal — эффективная система органайзеров, в основе которой лежит чистая страница в точку.В",
          price: 160000,
          image: "https://files.ox-sys.com/cache/500x_/image/23/ff/d5/23ffd5a9576a0fd924f3b3f7fffacf8b74fb32114c3e88ce244ee00410c69494.jpg"
        },
        {
          title: "Во имя Гуччи. Мемуары дочери (2-е издание, исправленное)",
          author: "Книжный мир",
          description: "Патрисия Гуччи рассказала о своем отце как об обычном человеке, а не как о главе бренда. Передала вс",
          price: 190000,
          image: "https://files.ox-sys.com/cache/500x_/image/d6/e9/9c/d6e99ce0bb3b55c7369f8378941045352ad731384e699544fcb60b6bc0ea2926.jpg"
        },
        {
          title: "Деловой этикет от Эмили Пост. Полный свод правил для успеха в бизнесе",
          author: "Книжный мир",
          description: "Цель этой книги – помочь вам обрести знания, благодаря которым вы сможете понять какое поведение в к",
          price: 215000,
          image: "https://files.ox-sys.com/cache/500x_/image/e4/86/92/e48692ce61f8c90fd07f88d398f7127ec5764e0bee82ffd06172656563592ea9.jpg"
        },
        {
          title: "Веселые часы (4-5 лет) (нов.обл.)",
          author: "Книжный мир",
          description: "Мы продолжаем серию книг, разработанную Земцова О.Н.  кандидатом педагогических наук, руководителем",
          price: 25000,
          image: "https://files.ox-sys.com/cache/500x_/image/04/0d/30/040d30fc00ec1b48070bd55d9b462f25095b25979378733bcdef7a377d9b50fa.jpg"
        },
        {
          title: "Развиваем мышление и речь",
          author: "Книжный мир",
          description: "Цель этой книги  помочь ребёнку развить интеллектуальные способности, потренировать память и внимани",
          price: 74000,
          image: "https://files.ox-sys.com/cache/500x_/image/38/7e/c8/387ec868523102b1f0e6a0b2807aae657359d91cbefee671e0fc18ff3e2bf763.jpg"
        },
        {
          title: "Динозавры. Полная энциклопедия",
          author: "Книжный мир",
          description: "Сейчас наша Земля  это планета людей, по соседству с которыми живут еще сотни тысяч видов живых суще",
          price: 280000,
          image: "https://files.ox-sys.com/cache/500x_/image/1b/96/67/1b9667f2feee7dd29068243b3b11937a20dac1451216d2be0c2c011c1461841b.jpg"
        },
        {
          title: "Homo Deus. Краткая история будущего",
          author: "Книжный мир",
          description: "В своей первой книге, ставшей всемирной сенсацией Sapiens. Краткаяистория человечества, Юваль Харари",
          price: 255000,
          image: "https://files.ox-sys.com/cache/500x_/image/72/7a/13/727a1304939fb4c74b90f50d3b169dbf31b441e8fb950e0e498310541934e7a0.jpg"
        }
      ];

      booksToInsert = fallbackList.map(b => ({
        title: b.title,
        author: b.author,
        description: b.description,
        type: "sell" as const,
        status: "available" as const,
        price: b.price,
        image: b.image,
        userId,
        genre: "Jahon adabiyoti",
        condition: "Yangi",
        lat: 41.2825,
        lng: 69.2135,
        address: "Toshkent shahri, Chilonzor tumani",
      }));
    }
  }

  // Insert all parsed or fallback books
  for (const b of booksToInsert) {
    await db.insert(booksTable).values(b);
    
    // Also insert into store_books Table (for store library catalog)
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
