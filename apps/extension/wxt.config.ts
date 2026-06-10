import { defineConfig } from 'wxt';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  browser: 'firefox',
  modules: ['@wxt-dev/module-react'],
  runner: {
    startUrls: ['https://www.reddit.com'],
    firefoxProfile: resolve(__dirname, '.wxt/firefox-dev-profile'),
    keepProfileChanges: true,
    firefoxPref: {
      'intl.accept_languages': 'en-US, en',
      'intl.locale.requested': 'en-US',
    },
  },
  manifest: {
    name: 'Redit',
    description: 'AI sidebar assistant',
    version: '0.1.0',
    permissions: ['tabs'],
  },
});
