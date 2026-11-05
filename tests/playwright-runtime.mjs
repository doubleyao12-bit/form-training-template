import { pathToFileURL } from 'node:url';
export async function loadPlaywright() {
  // An explicit module path is optional; no machine-specific default.
  return process.env.FORM_PLAYWRIGHT_PATH
    ? import(pathToFileURL(process.env.FORM_PLAYWRIGHT_PATH).href)
    : import('playwright');
}
