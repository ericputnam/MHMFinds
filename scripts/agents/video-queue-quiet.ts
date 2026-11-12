/**
 * Imported FIRST by video-queue.ts: the CLI prints JSON on stdout, so anything else that
 * calls console.log (setup-env, lib/prisma) is sent to stderr instead.
 */
const toStderr = (...args: unknown[]) => console.error(...args);
console.log = toStderr;
console.info = toStderr;

/** The only way video-queue.ts writes to stdout. */
export function emit(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
