import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FLAT_FILE = join(__dirname, '..', 'data', 'bom_flat.json');

let _cache = null;
function getFlat() {
  if (_cache && Object.keys(_cache).length > 0) return _cache;
  if (existsSync(FLAT_FILE)) {
    try { _cache = JSON.parse(readFileSync(FLAT_FILE, 'utf8')); } catch {}
  }
  return _cache || {};
}

const router = express.Router();

router.get('/', (req, res) => {
  const flat = getFlat();
  res.json({ codes: Object.keys(flat), count: Object.keys(flat).length });
});

router.get('/:code', (req, res) => {
  const flat = getFlat();
  const components = flat[req.params.code];
  if (!components) return res.status(404).json({ error: 'Not found', code: req.params.code });
  res.json({ code: req.params.code, components });
});

export default router;
