/**
 * Asset utilities for handling images and SVGs in production
 * Uses import.meta.env.BASE_URL to ensure correct paths in all environments
 */

// Get the base URL for assets (handles subdirectory deployments)
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Get the full path for a public asset
 * @param path - The path relative to the public folder (e.g., '/logo.png' or 'logo.png')
 * @returns The full path including base URL
 */
export function getAssetPath(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Ensure BASE_URL ends with slash
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  const finalPath = `${baseUrl}${cleanPath}`;
  return finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
}

// Pre-defined asset paths for commonly used images
export const assets = {
  logo: getAssetPath('logo.png'),
  dollar: getAssetPath('dollar.svg'),
  heroTransfer: getAssetPath('hero-transfer.jpg'),
  skyline: getAssetPath('skyline.jpg'),
  favicon: getAssetPath('favicon.ico'),
} as const;

export default assets;
