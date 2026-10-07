import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import logger from '../config/logger.js';

const menuPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../client/src/data/menu.json');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Upsert the website menu into Mongo so checkout can price real dishes.
 * MRP items have no fixed price and stay inactive.
 */
export async function seedCatalogIfEmpty() {
  const count = await Product.estimatedDocumentCount();
  if (count > 0) return 0;

  const menu = JSON.parse(readFileSync(menuPath, 'utf8'));
  const docs = [];

  for (const category of menu.categories) {
    category.items.forEach((item, index) => {
      const externalId = `${category.id}-${index + 1}`;
      const hasPrice = Number.isInteger(item.price) && item.price > 0;
      docs.push({
        name: item.name,
        slug: `${category.slug}-${slugify(item.name)}`,
        description: item.description || '',
        category: category.id,
        images: [item.image || category.image].filter(Boolean),
        externalId,
        isActive: hasPrice,
        isVeg: true,
        isBestseller: Boolean(item.bestseller),
        variants: [
          {
            variantId: 'default',
            name: 'Plate',
            pricePaise: hasPrice ? item.price * 100 : 0,
            stock: hasPrice ? 500 : 0,
            isActive: hasPrice,
          },
        ],
      });
    });
  }

  await Product.insertMany(docs, { ordered: false });
  logger.info({ count: docs.length }, 'Seeded product catalog from menu');
  return docs.length;
}
