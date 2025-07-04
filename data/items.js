const seeds = require('./seeds');
const nutrients = require('./nutrients');
const products = require('./products')

// Combine all items into a single Map for easy lookups by ID
const allItems = new Map();

Object.values(seeds).forEach(item => allItems.set(item.id, item));
Object.values(nutrients).forEach(item => allItems.set(item.id, item));
Object.values(products).forEach(item => allItems.set(item.id, item)); 

module.exports = allItems;