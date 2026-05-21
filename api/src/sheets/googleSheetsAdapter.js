import fs from 'node:fs';
import { google } from 'googleapis';
import { MEMBERS_TAB, checkinsTabTitle } from './constants.js';
import { mapGoogleError } from './errors.js';
import { createReadCache } from './readCache.js';

const CACHE_KEYS = {
  spreadsheetTitles: 'spreadsheet:titles',
  membersMeta: 'members:meta',
  membersRows: 'members:rows',
  checkinsMeta: (year) => `checkins:meta:${year}`,
  checkinsRows: (year) => `checkins:rows:${year}`,
};

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
  const cache = createReadCache();

  function invalidateMembersCache() {
    cache.invalidate(CACHE_KEYS.membersMeta);
    cache.invalidate(CACHE_KEYS.membersRows);
  }

  function invalidateCheckinsCache(year) {
    cache.invalidate(CACHE_KEYS.checkinsMeta(year));
    cache.invalidate(CACHE_KEYS.checkinsRows(year));
  }

  function invalidateSpreadsheetCache() {
    cache.invalidate(CACHE_KEYS.spreadsheetTitles);
  }

  function invalidateAfterSheetStructureChange() {
    invalidateSpreadsheetCache();
    cache.invalidatePrefix('checkins:meta:');
    cache.invalidatePrefix('checkins:rows:');
    invalidateMembersCache();
  }

  async function getSpreadsheetTitles() {
    const cached = cache.get(CACHE_KEYS.spreadsheetTitles);
    if (cached) {
      return cached;
    }
    const spreadsheet = await withGoogle(() =>
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      }),
    );
    const titles = spreadsheet.data.sheets ?? [];
    cache.set(CACHE_KEYS.spreadsheetTitles, titles);
    return titles;
  }

  async function withGoogle(fn) {
    try {
      return await fn();
    } catch (err) {
      throw mapGoogleError(err);
    }
  }

  async function getMembersTabMeta() {
    const cached = cache.get(CACHE_KEYS.membersMeta);
    if (cached) {
      return cached;
    }
    const sheetList = await getSpreadsheetTitles();
    const sheet = sheetList.find((s) => s.properties?.title === MEMBERS_TAB);
    if (!sheet) {
      const meta = { exists: false, headers: null };
      cache.set(CACHE_KEYS.membersMeta, meta);
      return meta;
    }

    const headerRes = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${MEMBERS_TAB}!1:1`,
      }),
    );
    const headers = headerRes.data.values?.[0] ?? null;
    const meta = { exists: true, headers };
    cache.set(CACHE_KEYS.membersMeta, meta);
    return meta;
  }

  async function createMembersTab(headers) {
    await withGoogle(async () => {
      invalidateAfterSheetStructureChange();
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
    invalidateMembersCache();
  }

  async function listMemberRows() {
    const cached = cache.get(CACHE_KEYS.membersRows);
    if (cached) {
      return cached;
    }
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${MEMBERS_TAB}!A2:E`,
      }),
    );
    const rows = res.data.values ?? [];
    const parsed = rows.map((row) => ({
      memberId: row[0] ?? '',
      firstName: row[1] ?? '',
      lastName: row[2] ?? '',
      optOutRanking: parseBool(row[3]),
      createdAt: row[4] ?? '',
    }));
    cache.set(CACHE_KEYS.membersRows, parsed);
    return parsed;
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
              row.optOutRanking ? 'TRUE' : 'FALSE',
              row.createdAt,
            ],
          ],
        },
      }),
    );
    invalidateMembersCache();
  }

  async function updateMemberRow(row) {
    const rows = await listMemberRows();
    const index = rows.findIndex((r) => r.memberId === row.memberId);
    if (index === -1) {
      throw new Error('Member not found');
    }
    const sheetRow = index + 2;
    await withGoogle(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${MEMBERS_TAB}!A${sheetRow}:E${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              row.memberId,
              row.firstName,
              row.lastName,
              row.optOutRanking ? 'TRUE' : 'FALSE',
              row.createdAt,
            ],
          ],
        },
      }),
    );
    invalidateMembersCache();
  }

  async function getCheckinsTabMeta(year) {
    const metaKey = CACHE_KEYS.checkinsMeta(year);
    const cached = cache.get(metaKey);
    if (cached) {
      return cached;
    }
    const title = checkinsTabTitle(year);
    const sheetList = await getSpreadsheetTitles();
    const sheet = sheetList.find((s) => s.properties?.title === title);
    if (!sheet) {
      const meta = { exists: false, headers: null };
      cache.set(metaKey, meta);
      return meta;
    }

    const headerRes = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!1:1`,
      }),
    );
    const headers = headerRes.data.values?.[0] ?? null;
    const meta = { exists: true, headers };
    cache.set(metaKey, meta);
    return meta;
  }

  async function createCheckinsTab(year, headers) {
    const title = checkinsTabTitle(year);
    await withGoogle(async () => {
      invalidateAfterSheetStructureChange();
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
    invalidateCheckinsCache(year);
  }

  async function listCheckinRows(year) {
    const rowsKey = CACHE_KEYS.checkinsRows(year);
    const cached = cache.get(rowsKey);
    if (cached) {
      return cached;
    }
    const title = checkinsTabTitle(year);
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!A2:C`,
      }),
    );
    const rows = res.data.values ?? [];
    const parsed = rows.map((row) => ({
      memberId: row[0] ?? '',
      date: row[1] ?? '',
      displayName: row[2] ?? '',
    }));
    cache.set(rowsKey, parsed);
    return parsed;
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
    invalidateCheckinsCache(year);
  }

  return {
    getMembersTabMeta,
    createMembersTab,
    listMemberRows,
    appendMemberRow,
    updateMemberRow,
    getCheckinsTabMeta,
    createCheckinsTab,
    listCheckinRows,
    appendCheckinRow,
  };
}
