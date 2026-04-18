/** @type {import('next').NextConfig} */
// Static export so the whole site can be served by GitHub Pages.
// If you later move to Vercel, you can remove `output: 'export'` and `images.unoptimized`.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const basePathSegment = isGithubPages && repoName ? `/${repoName}` : '';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePathSegment,
  assetPrefix: basePathSegment ? `${basePathSegment}/` : '',
};

export default nextConfig;
