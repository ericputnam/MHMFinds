// This repo pins glob@7.1.7 (see the import-site comments in context-budget.ts and
// next-experiment-id.ts), which ships no bundled type declarations, and @types/glob is not
// installed. This is a minimal ambient declaration covering only the two exports these
// scripts actually use (`sync`, with the subset of options they pass) — not a full glob@7
// type surface. If @types/glob is ever added as a real dependency, delete this file.
declare module "glob" {
  export interface GlobSyncOptions {
    cwd?: string;
    nodir?: boolean;
    [key: string]: unknown;
  }
  export function sync(pattern: string, options?: GlobSyncOptions): string[];
}
