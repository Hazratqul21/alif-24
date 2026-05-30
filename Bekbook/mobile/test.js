fetch('https://orginfo.uz/uz/search/api?q=302580193')
  .then(r => r.text())
  .then(t => {
    // Look for company name. It might be in an h5 or a or specific div
    const titleMatch = t.match(/<h5[^>]*>(.*?)<\/h5>/is);
    const aMatch = t.match(/<a[^>]*class=["']text-decoration-none text-dark["'][^>]*>\s*(.*?)\s*<\/a>/is);
    
    // Look for inn matching
    console.log("Title h5:", titleMatch ? titleMatch[1].trim() : 'none');
    console.log("Title a:", aMatch ? aMatch[1].trim() : 'none');
    
    // Find all h5, h4, h6 and links to see what is there
    const matches = [...t.matchAll(/<h5[^>]*>(.*?)<\/h5>/isg)];
    matches.forEach((m, i) => console.log(`H5 ${i}:`, m[1].trim().replace(/\n/g, '').substring(0, 100)));

    const divMatches = [...t.matchAll(/<div[^>]*class=["'][^"']*company-name[^"']*["'][^>]*>(.*?)<\/div>/isg)];
    divMatches.forEach((m, i) => console.log(`DIV ${i}:`, m[1].trim().replace(/\n/g, '').substring(0, 100)));
  });
