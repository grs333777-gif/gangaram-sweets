import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const html = read('index.html');
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
const verification = 'icBciOqa16LZlbM5RUMdw5Xc0-z1XjDGAVfuzJBvVqE';
const verificationTags = head.match(/google-site-verification/g) || [];

check(html.includes('lang="en-IN"'), 'homepage html lang is missing');
check(head.includes('name="viewport"'), 'viewport meta is missing from head');
check(head.includes('<title>Gangaram Sweets, Dalsinghsarai | Desi Ghee Mithai</title>'), 'homepage title mismatch');
check(head.includes('rel="canonical" href="https://www.gangaramsweets.in/"'), 'homepage canonical mismatch');
check(verificationTags.length === 1, 'google-site-verification must appear once in head');
check(head.includes(`content="${verification}"`), 'google-site-verification token mismatch');
check(!html.slice(html.indexOf('<body>')).includes('google-site-verification'), 'verification tag must not be in body');

const robots = read('public/robots.txt');
check(robots.includes('Allow: /'), 'robots.txt does not allow public crawling');
check(!/Disallow:\s*\/\s*$/m.test(robots), 'robots.txt disallows the whole site');
check(robots.includes('Sitemap: https://www.gangaramsweets.in/sitemap.xml'), 'sitemap reference missing from robots.txt');
for (const path of ['/cart', '/checkout', '/order-success', '/login', '/signup', '/account']) {
  check(robots.includes(`Disallow: ${path}`), `robots.txt should disallow ${path}`);
}

const sitemap = read('public/sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = [
  'https://www.gangaramsweets.in/',
  'https://www.gangaramsweets.in/menu',
  'https://www.gangaramsweets.in/about',
  'https://www.gangaramsweets.in/contact',
  'https://www.gangaramsweets.in/track-order',
  'https://www.gangaramsweets.in/terms',
  'https://www.gangaramsweets.in/privacy',
  'https://www.gangaramsweets.in/refund-shipping',
];
check(JSON.stringify(locs) === JSON.stringify(expected), `sitemap URLs differ: ${locs.join(', ')}`);
check(!sitemap.includes('lastmod'), 'sitemap must not invent lastmod dates');
for (const blocked of ['/cart', '/checkout', '/login', '/signup', '/account', '/order-success']) {
  check(!locs.some((loc) => loc.endsWith(blocked)), `sitemap includes private URL ${blocked}`);
}

const jsonMatch = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
check(Boolean(jsonMatch), 'homepage JSON-LD missing from head');
if (jsonMatch) {
  const data = JSON.parse(jsonMatch[1]);
  const serialized = JSON.stringify(data);
  check(serialized.includes('LocalBusiness'), 'LocalBusiness schema missing');
  check(serialized.includes('Dalsinghsarai'), 'schema is missing the city');
  check(!serialized.includes('"@type":"Product"') && !serialized.includes('"@type": "Product"'), 'Product schema is not used without product pages');
  check(!serialized.includes('aggregateRating'), 'schema must not invent ratings');
}

const publicPages = {
  'src/features/home/HomePage.jsx': '/',
  'src/features/menu/MenuPage.jsx': '/menu',
  'src/features/about/AboutPage.jsx': '/about',
  'src/features/contact/ContactPage.jsx': '/contact',
  'src/features/order/TrackOrderPage.jsx': '/track-order',
  'src/features/pages/PolicyPage.jsx': '/terms',
};
for (const [file, path] of Object.entries(publicPages)) {
  const source = read(file);
  check(source.includes('<Seo'), `${file} is missing the Seo component`);
  check(!source.includes('noindex'), `${file} must stay indexable`);
  if (file !== 'src/features/pages/PolicyPage.jsx') {
    check(source.includes(`path="${path}"`), `${file} canonical path mismatch`);
  }
}

for (const file of [
  'src/features/auth/LoginPage.jsx',
  'src/features/auth/SignupPage.jsx',
  'src/features/cart/CartPage.jsx',
  'src/features/checkout/CheckoutPage.jsx',
  'src/features/account/ProfilePage.jsx',
  'src/features/order/OrderSuccessPage.jsx',
  'src/features/admin/AdminDeskPage.jsx',
  'src/features/pages/NotFoundPage.jsx',
]) {
  check(read(file).includes('noindex'), `${file} is missing noindex`);
}

const vercel = read('vercel.json');
check(!vercel.includes('"source": "/(.*)"'), 'vercel.json still rewrites every URL to index.html');
check(vercel.includes('/404') || read('public/404.html').includes('noindex'), 'custom 404 is missing');
check(read('public/404.html').includes('noindex'), '404.html must be noindex');

const app = read('src/App.jsx');
for (const route of ['menu', 'about', 'contact', 'track-order', 'terms', 'privacy', 'refund-shipping']) {
  check(app.includes(`path="${route}"`), `App.jsx is missing /${route}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`SEO checks passed (${expected.length} sitemap URLs, verification tag present once).`);
