/**
 * Helper to split messy song titles into clean title and movie/album context.
 * Extracts patterns like:
 *   - (From "Dude")
 *   - (From 'Leo')
 *   - - From "X"
 *   - (Original Motion Picture Soundtrack)
 *   - (From Film)
 */
export function splitTitle(rawTitle: string): { name: string; movie?: string } {
  if (!rawTitle) return { name: "" };

  let title = rawTitle.trim();
  let movie: string | undefined = undefined;

  // Pattern 1: (From "Movie") or [From "Movie"] or (From 'Movie') or (From Movie)
  const fromParenRegex = /[\(\[]\s*from\s+["'“`]?([^"'”`()\[\]]+?)["'”`]?\s*[\)\]]/i;
  const match1 = title.match(fromParenRegex);
  if (match1) {
    const candidate = match1[1].trim();
    if (!/soundtrack|ost|motion picture/i.test(candidate)) {
      movie = candidate;
    }
    title = title.replace(fromParenRegex, "").trim();
  }

  // Pattern 2: - From "Movie" or - From 'Movie' or - From Movie
  if (!movie) {
    const fromHyphenRegex = /[-–—]\s*from\s+["'“`]?([^"'”`()\[\]]+?)["'”`]?$/i;
    const match2 = title.match(fromHyphenRegex);
    if (match2) {
      movie = match2[1].trim();
      title = title.replace(fromHyphenRegex, "").trim();
    }
  }

  // Clean up trailing soundtrack tags: (Original Motion Picture Soundtrack), (OST), [OST]
  title = title
    .replace(/[\(\[]\s*(?:original\s+motion\s+picture\s+soundtrack|motion\s+picture\s+soundtrack|original\s+soundtrack|ost)\s*[\)\]]/gi, "")
    .trim();

  // Clean trailing hyphens, dashes, commas, or extra whitespace
  title = title.replace(/[-–—,\s]+$/, "").trim();

  return {
    name: title || rawTitle,
    movie: movie || undefined,
  };
}
