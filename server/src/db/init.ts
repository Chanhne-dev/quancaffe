import { initDatabase, db } from './database.js';

initDatabase();

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
console.log('Tables successfully created (' + tables.length + '):');
tables.forEach(t => console.log(' - ' + t.name));

const items = db.prepare("SELECT count(*) as count FROM DANH_MUC_MON").get() as { count: number };
console.log('Sample menu items count:', items.count);
