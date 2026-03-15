import { readFileSync } from 'fs';
import { join } from 'path';
import ChangelogClient from './ChangelogClient';

interface ChangelogEntry {
  version: string;
  date: string;
  categories: { name: string; items: string[] }[];
}

function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = raw.split('\n');

  let current: ChangelogEntry | null = null;
  let currentCategory: { name: string; items: string[] } | null = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(.+?)\](?:\s+-\s+(.+))?/);
    if (versionMatch) {
      if (current) {
        if (currentCategory) current.categories.push(currentCategory);
        if (current.version !== 'Unreleased' || current.categories.some(c => c.items.length > 0)) {
          entries.push(current);
        }
      }
      currentCategory = null;
      if (versionMatch[1] === 'Unreleased') {
        current = { version: 'Unreleased', date: '', categories: [] };
      } else {
        current = { version: versionMatch[1], date: versionMatch[2] || '', categories: [] };
      }
      continue;
    }

    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && current) {
      if (currentCategory) current.categories.push(currentCategory);
      currentCategory = { name: categoryMatch[1], items: [] };
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentCategory) {
      currentCategory.items.push(itemMatch[1]);
    }
  }

  if (current) {
    if (currentCategory) current.categories.push(currentCategory);
    if (current.version !== 'Unreleased' || current.categories.some(c => c.items.length > 0)) {
      entries.push(current);
    }
  }

  return entries;
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
  const entries = parseChangelog(raw);
  return <ChangelogClient entries={entries} />;
}
