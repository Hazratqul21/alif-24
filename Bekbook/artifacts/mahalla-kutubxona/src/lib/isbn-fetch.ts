export interface IsbnBookData {
  title: string;
  author: string;
  description: string;
  source: string;
}

export async function fetchByIsbn(isbn: string): Promise<IsbnBookData | null> {
  const clean = isbn.replace(/[^0-9X]/gi, "");

  // 1. OpenLibrary
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
    );
    const data = await res.json();
    const book = data[`ISBN:${clean}`];
    if (book?.title) {
      return {
        title: book.title,
        author: book.authors?.[0]?.name ?? "",
        description: book.subtitle ?? "",
        source: "OpenLibrary",
      };
    }
  } catch {
    // ignore, try next
  }

  // 2. Google Books
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`
    );
    const data = await res.json();
    const item = data?.items?.[0]?.volumeInfo;
    if (item?.title) {
      return {
        title: item.title,
        author: item.authors?.[0] ?? "",
        description: item.description?.slice(0, 200) ?? item.subtitle ?? "",
        source: "Google Books",
      };
    }
  } catch {
    // ignore
  }

  return null;
}
