import pg from 'pg';
const { Client } = pg;

async function check() {
  const connectionString = process.env.DATABASE_URL || "postgres://mahalla:mahalla123@localhost:5432/mahalla_db";
  console.log("Connecting to Postgres at:", connectionString);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected successfully!");

    // 1. Check books table
    const booksRes = await client.query("SELECT * FROM books ORDER BY created_at DESC LIMIT 10;");
    console.log(`\n--- global books (total checked: ${booksRes.rowCount}) ---`);
    const totalCountRes = await client.query("SELECT count(*) FROM books;");
    console.log("Exact total books in books table:", totalCountRes.rows[0].count);
    booksRes.rows.forEach((b, i) => {
      console.log(`  ${i+1}. [ID: ${b.id}] "${b.title}" (Author: ${b.author}, Genre: ${b.genre}, Price: ${b.price}, UserID: ${b.user_id})`);
    });

    // 2. Check store_books table
    const storeBooksRes = await client.query("SELECT * FROM store_books ORDER BY id DESC LIMIT 10;");
    console.log(`\n--- store_books (total checked: ${storeBooksRes.rowCount}) ---`);
    const totalStoreBooksRes = await client.query("SELECT count(*) FROM store_books;");
    console.log("Exact total store books in store_books table:", totalStoreBooksRes.rows[0].count);
    storeBooksRes.rows.forEach((b, i) => {
      console.log(`  ${i+1}. [Store ID: ${b.store_id}] "${b.title}" - Price: ${b.price} (Condition: ${b.condition})`);
    });

    // 3. Check stores
    const storesRes = await client.query("SELECT * FROM stores;");
    console.log(`\n--- stores (total: ${storesRes.rowCount}) ---`);
    storesRes.rows.forEach((s) => {
      console.log(`  [Store ID: ${s.id}] "${s.name}" (Owner ID: ${s.owner_id})`);
    });

  } catch (err) {
    console.error("Postgres connection or query failed:", err);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

check();
