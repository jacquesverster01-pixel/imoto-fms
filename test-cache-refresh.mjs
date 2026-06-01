import 'dotenv/config';
import { refreshStockCache } from './routes/stockAllocation.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting refresh...');
console.log('API_ID set:', !!process.env.UNLEASHED_API_ID);
console.log('API_KEY set:', !!process.env.UNLEASHED_API_SECRET);

const result = await refreshStockCache();
console.log('Refresh result:', JSON.stringify(result));

const cacheFile = path.join(__dirname, 'data', 'stock_cache.json');
const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
const entries = Object.entries(cache.byCode || {});
const withAvgCost = entries.filter(([, v]) => v.avgCost > 0);
console.log('Done. Items cached:', entries.length);
console.log('Items with avgCost > 0:', withAvgCost.length);
const sample = withAvgCost.slice(0, 3);
console.log('Sample with avgCost:', JSON.stringify(sample, null, 2));
