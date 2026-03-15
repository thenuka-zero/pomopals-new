import { readFileSync } from 'fs';
import { join } from 'path';

interface ChangelogEntry {
  version: string;
  date: string;
  categories: { name: string; items: string[] }[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  Added: '✨',
  Fixed: '🐛',
  Changed: '🔄',
  Removed: '🗑️',
  Security: '🔒',
  Deprecated: '⚠️',
  Performance: '⚡',
};

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

function ChangelogSection({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  const isUnreleased = entry.version === 'Unreleased';

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full bg-[#E54B4B] border-2 border-[#FDF6EC] shadow-sm" />

      <div className={`bg-white rounded-2xl border ${isLatest ? 'border-[#E54B4B]/30 shadow-md shadow-[#E54B4B]/10' : 'border-[#F0E6D3] shadow-sm'} p-6 mb-6`}>
        {/* Version header */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-extrabold ${
            isUnreleased
              ? 'bg-[#F0E6D3] text-[#8B7355]'
              : 'bg-[#E54B4B] text-white'
          }`}>
            {isUnreleased ? '🚧 Unreleased' : `🍅 v${entry.version}`}
          </span>

          {isLatest && !isUnreleased && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF0F0] text-[#E54B4B] border border-[#E54B4B]/20">
              ✨ Latest
            </span>
          )}

          {entry.date && (
            <span className="text-xs text-[#B8A080] font-medium ml-auto">
              📅 {entry.date}
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {entry.categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">
                  {CATEGORY_EMOJI[cat.name] ?? '📌'}
                </span>
                <h3 className="text-sm font-extrabold text-[#3D2C2C] uppercase tracking-wider">
                  {cat.name}
                </h3>
              </div>
              <ul className="space-y-1.5 pl-1">
                {cat.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="text-[#E54B4B] text-xs mt-1.5 flex-shrink-0">●</span>
                    <span className="text-sm text-[#5C4033] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
  const entries = parseChangelog(raw);

  return (
    <main className="min-h-screen bg-[#FDF6EC]">
      <div className="max-w-2xl mx-auto px-6 py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-5xl leading-none select-none block mb-4">🍅</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#3D2C2C]">
            What&apos;s New
          </h1>
          <p className="mt-2 text-[#8B7355] font-medium">
            Every little update, with love.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="text-center text-[#B8A080]">No entries yet. Check back soon! 🌱</p>
        ) : (
          /* Timeline */
          <div className="relative pl-10 border-l-2 border-dashed border-[#F0E6D3]">
            {entries.map((entry, i) => (
              <ChangelogSection key={entry.version} entry={entry} isLatest={i === 0} />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
