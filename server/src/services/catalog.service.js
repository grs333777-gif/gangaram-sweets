import { readFileSync, writeFileSync } from 'fs';
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
      if (item.removed) return;
      const externalId = `${category.id}-${index + 1}`;
      const hasPrice = Number(item.price) > 0 && !item.mrp;
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
            pricePaise: hasPrice ? Math.round(Number(item.price) * 100) : 0,
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

/**
 * Kept for a manual one-off if the database is empty of prices.
 * Do not call this on startup. The shop desk owns prices and removals,
 * and a startup sync would put the menu file back over those edits.
 */
export async function syncCatalogPrices() {
  const menu = JSON.parse(readFileSync(menuPath, 'utf8'));
  const ops = [];

  for (const category of menu.categories) {
    category.items.forEach((item, index) => {
      if (item.removed) return;
      const externalId = `${category.id}-${index + 1}`;
      const hasPrice = Number(item.price) > 0 && !item.mrp;
      ops.push({
        updateOne: {
          filter: { externalId },
          update: {
            $set: {
              isActive: hasPrice,
              'variants.$[variant].pricePaise': hasPrice ? item.price * 100 : 0,
              'variants.$[variant].isActive': hasPrice,
            },
          },
          arrayFilters: [{ 'variant.variantId': 'default' }],
        },
      });
    });
  }

  if (ops.length === 0) return 0;
  const result = await Product.bulkWrite(ops, { ordered: false });
  logger.info({ matched: result.matchedCount, modified: result.modifiedCount }, 'Synced menu prices');
  return result.modifiedCount;
}

export function publishedExternalIds() {
  const menu = JSON.parse(readFileSync(menuPath, 'utf8'));
  const ids = new Set();
  for (const category of menu.categories) {
    category.items.forEach((item, index) => {
      if (!item.removed) ids.add(`${category.id}-${index + 1}`);
    });
  }
  return ids;
}

function menuItem(menu, externalId) {
  const match = String(externalId || '').match(/^(.*)-(\d+)$/);
  if (!match) return null;
  const category = menu.categories.find((item) => item.id === match[1]);
  const index = Number(match[2]) - 1;
  if (!category || !category.items[index]) return null;
  return category.items[index];
}

let menuWrite = Promise.resolve();

function changeMenuItem(externalId, change) {
  menuWrite = menuWrite.then(() => {
    const menu = JSON.parse(readFileSync(menuPath, 'utf8'));
    const item = menuItem(menu, externalId);
    if (!item) return false;
    change(item);
    writeFileSync(menuPath, `${JSON.stringify(menu, null, 2)}\n`);
    return true;
  }).catch((err) => {
    logger.warn({ err, externalId }, 'Could not update the menu file');
    return false;
  });
  return menuWrite;
}

export function writeMenuPrice(externalId, pricePaise) {
  const rupees = pricePaise / 100;
  return changeMenuItem(externalId, (item) => {
    item.price = Number.isInteger(rupees) ? rupees : Math.round(rupees * 100) / 100;
    delete item.mrp;
    delete item.removed;
  });
}

export function writeMenuRemoval(externalId) {
  return changeMenuItem(externalId, (item) => {
    item.removed = true;
  });
}
