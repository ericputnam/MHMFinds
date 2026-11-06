/**
 * Source-level import checks for guard tests.
 *
 * Why this exists (E364, Ops, 2026-11-06): two guards went red on main because
 * they matched the literal text `import { X } from '…'`. The moment a file
 * imported a second name from the same module (#437 added
 * `collectionBreadcrumbJsonLd` next to `collectionMetadata`), the guard failed
 * even though the wiring it protects was intact. Ask "does this file import
 * the name X from a module whose path ends in M?" — not "does it contain this
 * exact line".
 *
 * Comments are stripped first: this repo's comments quote the patterns they
 * describe, so a naive scan matches the documentation instead of the code.
 */

export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\w\\])\/\/.*$/gm, '$1');
}

/** Every named, value-level import in `src`, keyed by module specifier. */
export function namedImports(src: string): Array<{ from: string; names: string[] }> {
  const out: Array<{ from: string; names: string[] }> = [];
  const re = /import\s+(?!type\b)(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  const code = stripComments(src);
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const names = m[1]
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !s.startsWith('type '))
      .map((s: string) => s.split(/\s+as\s+/)[0].trim());
    out.push({ from: m[2], names });
  }
  return out;
}

/**
 * True when `src` imports `name` (not as a type-only import) from a specifier
 * whose path ends with `moduleSuffix` — so `@/lib/seo/catalogCount`,
 * `./catalogCount` and `../../lib/seo/catalogCount` all match
 * `catalogCount`, and `lib/seo/catalogCount` matches the first and last.
 */
export function importsName(src: string, name: string, moduleSuffix: string): boolean {
  const suffix = moduleSuffix.replace(/^\/+/, '');
  return namedImports(src).some(
    (i) => (i.from === suffix || i.from.endsWith('/' + suffix)) && i.names.includes(name),
  );
}
