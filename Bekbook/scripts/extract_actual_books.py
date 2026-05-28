import json

with open("knigamir_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

blocks = data.get("props", {}).get("market_data", {}).get("blocks", [])

real_books = []
for block in blocks:
    products = block.get("products", [])
    for p in products:
        var = p.get("variation", {})
        name = var.get("name")
        desc = var.get("shortDescription") or ""
        price = p.get("newPrice") or 0
        
        # Get first image
        images = var.get("images", [])
        image_url = ""
        if images:
            image_url = images[0].get("urls", {}).get("500x_") or images[0].get("urls", {}).get("original") or ""
            
        if name and price and image_url:
            real_books.append({
                "title": name,
                "description": desc,
                "price": price,
                "image": image_url
            })

# Remove duplicates
unique_books = []
seen = set()
for b in real_books:
    if b["title"] not in seen:
        seen.add(b["title"])
        unique_books.append(b)

print(f"Extracted {len(unique_books)} unique books!")
print("\nFirst 10 books:")
for i, b in enumerate(unique_books[:10]):
    print(f"{i+1}. {b['title']} - {b['price']} UZS")
    print(f"   Image: {b['image']}")
    print(f"   Desc: {b['description'][:100]}...")
