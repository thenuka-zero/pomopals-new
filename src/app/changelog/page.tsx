import { readFileSync } from 'fs';
import { join } from 'path';

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

function ChangelogSection({ entry }: { entry: ChangelogEntry }) {
  const isUnreleased = entry.version === 'Unreleased';
  return (
    <div className="mb-10 pb-10 border-b border-[#F0E6D3] last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-xl font-bold text-[#3D2C2C]">
          {isUnreleased ? 'Unreleased' : `v${entry.version}`}
        </h2>
        {entry.date && (
          <span className="text-sm text-[#B8A080]">{entry.date}</span>
        )}
      </div>
      {entry.categories.map((cat) => (
        <div key={cat.name} className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E54B4B] mb-2">
            {cat.name}
          </h3>
          <ul className="space-y-1">
            {cat.items.map((item, i) => (
              <li key={i} className="text-[#5C4033] text-sm flex gap-2">
                <span className="text-[#B8A080] mt-0.5">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
  const entries = parseChangelog(raw);

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-[#3D2C2C] mb-2">Changelog</h1>
          <p className="text-[#B8A080] text-sm">What&apos;s new with PomoPals</p>
        </div>
        {entries.length === 0 ? (
          <p className="text-[#B8A080]">No entries yet.</p>
        ) : (
          entries.map((entry) => (
            <ChangelogSection key={entry.version} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
