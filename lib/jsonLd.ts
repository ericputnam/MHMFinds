/**
 * Serialize a JSON-LD object for a `<script type="application/ld+json">` tag.
 *
 * Plain JSON.stringify leaves `<` as-is, so a scraped or user-submitted title
 * containing `</script>` would close the tag and inject markup. `<` is
 * the same character to any JSON parser and inert to the HTML parser.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
