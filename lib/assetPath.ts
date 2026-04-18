/**
 * Use page-relative paths for files in `public/` (no leading `/`).
 * Root-relative URLs like `/intro.mp4` break on GitHub Pages project sites
 * (they resolve to `https://org.github.io/intro.mp4` instead of
 * `https://org.github.io/repo-name/intro.mp4`).
 */
export function publicAsset(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path.slice(1) : path;
}
