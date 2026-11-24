import { mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

const [, , destination] = process.argv;
if (!process.env.TED_DATA_DIR || !destination) {
  throw new Error('Set TED_DATA_DIR and pass the backup file path.');
}
const source = resolve(join(process.env.TED_DATA_DIR, 'garden.sqlite'));
const target = resolve(destination);
if (source === target) throw new Error('Use a different file path for the backup.');
try {
  statSync(target);
  throw new Error('Backup file already exists. Use a new file path.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
mkdirSync(dirname(target), { recursive: true });
const database = new DatabaseSync(source, { readOnly: true });
try {
  await backup(database, target);
} finally {
  database.close();
}
