import { readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

export interface ScannedFile {
  path: string;       // Absolute path
  relativePath: string; // Relative to knowledge root
  mtime: number;       // Modified time in ms
}

export function scanDirectory(rootDir: string, skipDirs: string[] = []): ScannedFile[] {
  const files: ScannedFile[] = [];
  const skipSet = new Set(skipDirs.map(d => d.toLowerCase()));

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (skipSet.has(entry.name.toLowerCase())) continue;
        walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        const stat = statSync(fullPath);
        files.push({
          path: fullPath,
          relativePath: relative(rootDir, fullPath),
          mtime: stat.mtimeMs,
        });
      }
    }
  }

  walk(rootDir);
  return files;
}
