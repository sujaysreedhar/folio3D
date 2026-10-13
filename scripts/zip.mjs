import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { zipSync } from 'fflate';

export async function zipDirectory(directory, filename) {
  const files = {};
  async function visit(path, prefix = '') {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await visit(join(path, entry.name), name + '/');
      else if (entry.isFile())
        files[name] = [
          new Uint8Array(await readFile(join(path, entry.name))),
          { mtime: new Date('2026-01-01T00:00:00Z') },
        ];
    }
  }
  await visit(directory);
  await writeFile(filename, zipSync(files, { level: 6 }));
}
