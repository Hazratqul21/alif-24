import { useEffect } from 'react';

/**
 * Zero-dependency SEO component.
 * Dynamically updates <title>, meta description, canonical URL, OpenGraph
 * and Twitter Card tags without needing react-helmet or any other package.
 *
 * Usage:
 *   <SEO title="Olimpiada" description="..." path="/olympiads" image="/banner.png" />
 *
 *   // With structured data / breadcrumbs:
 *   <SEO
 *     title="Biz haqimizda"
 *     path="/about"
 *     breadcrumbs={[{ name: 'Bosh sahifa', path: '/' }, { name: 'Biz haqimizda', path: '/about' }]}
 *     jsonLd={{ '@context': 'https://schema.org', '@type': 'AboutPage', ... }}
 *   />
 */
const DEFAULT_SITE = 'Alif24';
const DEFAULT_DESCRIPTION =
  "Alif24 — 5-11 yoshdagi bolalar uchun adaptiv ta'lim platformasi. Darslar, o'yinlar, olimpiadalar, AI testlar va harflar dunyosi bir joyda.";
const DEFAULT_IMAGE = 'https://alif24.uz/Logo.png';
const DEFAULT_ORIGIN = 'https://alif24.uz';

const setMeta = (attr, key, value) => {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

const setLink = (rel, href) => {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

// SEO-managed JSON-LD scripts are marked with data-seo="1" so we can update or
// remove them on navigation without touching hand-authored ones in index.html.
const setJsonLd = (id, data) => {
  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`;
  let el = document.head.querySelector(selector);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo-id', id);
    el.setAttribute('data-seo', '1');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  path,
  type = 'website',
  noindex = false,
  siteName = DEFAULT_SITE,
  jsonLd = null,
  breadcrumbs = null,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN;
    const canonical = path ? `${origin}${path}` : typeof window !== 'undefined' ? window.location.href : origin;
    setLink('canonical', canonical);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:site_name', siteName);
    setMeta('property', 'og:locale', 'uz_UZ');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // Breadcrumbs → JSON-LD
    if (Array.isArray(breadcrumbs) && breadcrumbs.length) {
      const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.path?.startsWith('http') ? b.path : `${origin}${b.path || '/'}`,
        })),
      };
      setJsonLd('breadcrumbs', breadcrumbLd);
    } else {
      setJsonLd('breadcrumbs', null);
    }

    // Custom page-level JSON-LD (AboutPage, FAQPage, etc.)
    setJsonLd('page', jsonLd || null);

    return () => {
      // Leave breadcrumbs/page JSON-LD until the next page sets its own;
      // they will be overwritten or removed on next render.
    };
  }, [title, description, keywords, image, path, type, noindex, siteName, jsonLd, breadcrumbs]);

  return null;
}
