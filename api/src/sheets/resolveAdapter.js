import { createGoogleSheetsAdapter } from './googleSheetsAdapter.js';
import { createInMemorySheetsAdapter } from './inMemoryAdapter.js';

export function resolveSheetsAdapter(config) {
  if (config.sheetsAdapter) {
    return config.sheetsAdapter;
  }
  if (config.spreadsheetId && config.googleServiceAccountPath) {
    return createGoogleSheetsAdapter(config);
  }
  return createInMemorySheetsAdapter();
}
