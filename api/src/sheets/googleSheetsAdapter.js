import fs from 'node:fs';
import { google } from 'googleapis';
import { MEMBERS_TAB, checkinsTabTitle } from './constants.js';
import { mapGoogleError } from './errors.js';

function parseBool(value) {
  if (value === true || value === 'TRUE' || value === 'true') {
    return true;
  }
  if (value === false || value === 'FALSE' || value === 'false') {
    return false;
  }
  return Boolean(value);
}

export function createGoogleSheetsAdapter(config) {
  const credentials = JSON.parse(
    fs.readFileSync(config.googleServiceAccountPath, 'utf8'),
  );
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.spreadsheetId;

  let spreadsheetCache = null;
  let spreadsheetCacheAt = 0;
  const SPREADSHEET_CACHE_MS = 60_000;

  async function getSpreadsheetTitles() {
    const now = Date.now();
    if (
      spreadsheetCache &&
      now - spreadsheetCacheAt < SPREADSHEET_CACHE_MS
    ) {
      return spreadsheetCache;
    }
    const spreadsheet = await withGoogle(() =>
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      }),
    );
    spreadsheetCache = spreadsheet.data.sheets ?? [];
    spreadsheetCacheAt = now;
    return spreadsheetCache;
  }

  function invalidateSpreadsheetCache() {
    spreadsheetCache = null;
    spreadsheetCacheAt = 0;
  }

  async function withGoogle(fn) {
    try {
      return await fn();
    } catch (err) {
      throw mapGoogleError(err);
    }
  }

  async function getMembersTabMeta() {
    const sheetList = await getSpreadsheetTitles();
    const sheet = sheetList.find((s) => s.properties?.title === MEMBERS_TAB);
    if (!sheet) {
      return { exists: false, headers: null };
    }

    const headerRes = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${MEMBERS_TAB}!1:1`,
      }),
    );
    const headers = headerRes.data.values?.[0] ?? null;
    return { exists: true, headers };
  }

  async function createMembersTab(headers) {
    await withGoogle(async () => {
      invalidateSpreadsheetCache();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: MEMBERS_TAB },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${MEMBERS_TAB}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    });
  }

  async function listMemberRows() {
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${MEMBERS_TAB}!A2:E`,
      }),
    );
    const rows = res.data.values ?? [];
    return rows.map((row) => ({
      memberId: row[0] ?? '',
      firstName: row[1] ?? '',
      lastName: row[2] ?? '',
      optOutRanking: parseBool(row[3]),
      createdAt: row[4] ?? '',
    }));
  }

  async function appendMemberRow(row) {
    await withGoogle(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${MEMBERS_TAB}!A:E`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [
            [
              row.memberId,
              row.firstName,
              row.lastName,
              row.optOutRanking,
              row.createdAt,
            ],
          ],
        },
      }),
    );
  }

  async function getCheckinsTabMeta(year) {
    const title = checkinsTabTitle(year);
    const sheetList = await getSpreadsheetTitles();
    const sheet = sheetList.find((s) => s.properties?.title === title);
    if (!sheet) {
      return { exists: false, headers: null };
    }

    const headerRes = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!1:1`,
      }),
    );
    const headers = headerRes.data.values?.[0] ?? null;
    return { exists: true, headers };
  }

  async function createCheckinsTab(year, headers) {
    const title = checkinsTabTitle(year);
    await withGoogle(async () => {
      invalidateSpreadsheetCache();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    });
  }

  async function listCheckinRows(year) {
    const title = checkinsTabTitle(year);
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!A2:C`,
      }),
    );
    const rows = res.data.values ?? [];
    return rows.map((row) => ({
      memberId: row[0] ?? '',
      date: row[1] ?? '',
      displayName: row[2] ?? '',
    }));
  }

  async function appendCheckinRow(year, row) {
    const title = checkinsTabTitle(year);
    await withGoogle(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${title}!A:C`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[row.memberId, row.date, row.displayName]],
        },
      }),
    );
  }

  return {
    getMembersTabMeta,
    createMembersTab,
    listMemberRows,
    appendMemberRow,
    getCheckinsTabMeta,
    createCheckinsTab,
    listCheckinRows,
    appendCheckinRow,
  };
}
