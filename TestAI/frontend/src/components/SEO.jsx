import { useEffect } from 'react';

/**
 * Zero-dependency SEO component.
 * Dynamically updates <title>, meta description, canonical URL, OpenGraph
 * and Twitter Card tags without needing react-helmet or any other package.
 *
 * Usage:
 *   <SEO title="Olimpiada" description="..." path="/olympiads" image="/banner.png" />
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

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  path,
  type = 'website',
  noindex = false,
  siteName = DEFAULT_SITE,
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
  }, [title, description, keywords, image, path, type, noindex, siteName]);

  return null;
}
