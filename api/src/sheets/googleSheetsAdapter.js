import fs from 'node:fs';
import { google } from 'googleapis';
import {
  MEMBERS_TAB,
  GROUPS_TAB,
  MEMBER_GROUPS_TAB,
  checkinsTabTitle,
} from './constants.js';
import { mapGoogleError } from './errors.js';
import { createReadCache } from './readCache.js';

const CACHE_KEYS = {
  spreadsheetTitles: 'spreadsheet:titles',
  membersMeta: 'members:meta',
  membersRows: 'members:rows',
  groupsMeta: 'groups:meta',
  groupsRows: 'groups:rows',
  memberGroupsMeta: 'memberGroups:meta',
  memberGroupsRows: 'memberGroups:rows',
  checkinsMeta: (title) => `checkins:meta:${title}`,
  checkinsRows: (title) => `checkins:rows:${title}`,
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

  function invalidateGroupsCache() {
    cache.invalidate(CACHE_KEYS.groupsMeta);
    cache.invalidate(CACHE_KEYS.groupsRows);
  }

  function invalidateMemberGroupsCache() {
    cache.invalidate(CACHE_KEYS.memberGroupsMeta);
    cache.invalidate(CACHE_KEYS.memberGroupsRows);
  }

  function invalidateCheckinsCache(title) {
    cache.invalidate(CACHE_KEYS.checkinsMeta(title));
    cache.invalidate(CACHE_KEYS.checkinsRows(title));
  }

  function invalidateSpreadsheetCache() {
    cache.invalidate(CACHE_KEYS.spreadsheetTitles);
  }

  function invalidateAfterSheetStructureChange() {
    invalidateSpreadsheetCache();
    cache.invalidatePrefix('checkins:meta:');
    cache.invalidatePrefix('checkins:rows:');
    invalidateMembersCache();
    invalidateGroupsCache();
    invalidateMemberGroupsCache();
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

  async function getTabMeta(title) {
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

  async function createTab(title, headers) {
    await withGoogle(async () => {
      invalidateAfterSheetStructureChange();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    });
  }

  async function getMembersTabMeta() {
    const cached = cache.get(CACHE_KEYS.membersMeta);
    if (cached) {
      return cached;
    }
    const meta = await getTabMeta(MEMBERS_TAB);
    cache.set(CACHE_KEYS.membersMeta, meta);
    return meta;
  }

  async function createMembersTab(headers) {
    await createTab(MEMBERS_TAB, headers);
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

  async function getGroupsTabMeta() {
    const cached = cache.get(CACHE_KEYS.groupsMeta);
    if (cached) {
      return cached;
    }
    const meta = await getTabMeta(GROUPS_TAB);
    cache.set(CACHE_KEYS.groupsMeta, meta);
    return meta;
  }

  async function createGroupsTab(headers) {
    await createTab(GROUPS_TAB, headers);
    invalidateGroupsCache();
  }

  async function listGroupRows() {
    const cached = cache.get(CACHE_KEYS.groupsRows);
    if (cached) {
      return cached;
    }
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${GROUPS_TAB}!A2:C`,
      }),
    );
    const rows = res.data.values ?? [];
    const parsed = rows
      .map((row) => ({
        groupId: (row[0] ?? '').toString().trim(),
        name: (row[1] ?? '').toString().trim(),
        createdAt: row[2] ?? '',
      }))
      .filter((row) => row.groupId !== '');
    cache.set(CACHE_KEYS.groupsRows, parsed);
    return parsed;
  }

  async function getMemberGroupsTabMeta() {
    const cached = cache.get(CACHE_KEYS.memberGroupsMeta);
    if (cached) {
      return cached;
    }
    const meta = await getTabMeta(MEMBER_GROUPS_TAB);
    cache.set(CACHE_KEYS.memberGroupsMeta, meta);
    return meta;
  }

  async function createMemberGroupsTab(headers) {
    await createTab(MEMBER_GROUPS_TAB, headers);
    invalidateMemberGroupsCache();
  }

  async function listMemberGroupRows() {
    const cached = cache.get(CACHE_KEYS.memberGroupsRows);
    if (cached) {
      return cached;
    }
    const res = await withGoogle(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${MEMBER_GROUPS_TAB}!A2:B`,
      }),
    );
    const rows = res.data.values ?? [];
    const parsed = rows.map((row) => ({
      memberId: row[0] ?? '',
      groupIds: row[1] ?? '',
    }));
    cache.set(CACHE_KEYS.memberGroupsRows, parsed);
    return parsed;
  }

  async function appendMemberGroupRow(row) {
    await withGoogle(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${MEMBER_GROUPS_TAB}!A:B`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[row.memberId, row.groupIds]],
        },
      }),
    );
    invalidateMemberGroupsCache();
  }

  async function updateMemberGroupRow(row) {
    const rows = await listMemberGroupRows();
    const index = rows.findIndex((r) => r.memberId === row.memberId);
    if (index === -1) {
      throw new Error('Member group row not found');
    }
    const sheetRow = index + 2;
    await withGoogle(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${MEMBER_GROUPS_TAB}!A${sheetRow}:B${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[row.memberId, row.groupIds]],
        },
      }),
    );
    invalidateMemberGroupsCache();
  }

  async function getCheckinTabMeta(title) {
    const metaKey = CACHE_KEYS.checkinsMeta(title);
    const cached = cache.get(metaKey);
    if (cached) {
      return cached;
    }
    const meta = await getTabMeta(title);
    cache.set(metaKey, meta);
    return meta;
  }

  async function createCheckinTab(title, headers) {
    await createTab(title, headers);
    invalidateCheckinsCache(title);
  }

  async function listCheckinRowsByTitle(title) {
    const rowsKey = CACHE_KEYS.checkinsRows(title);
    const cached = cache.get(rowsKey);
    if (cached) {
      return cached;
    }
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

  async function appendCheckinRowByTitle(title, row) {
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
    invalidateCheckinsCache(title);
  }

  function getCheckinsTabMeta(year) {
    return getCheckinTabMeta(checkinsTabTitle(year));
  }

  function createCheckinsTab(year, headers) {
    return createCheckinTab(checkinsTabTitle(year), headers);
  }

  function listCheckinRows(year) {
    return listCheckinRowsByTitle(checkinsTabTitle(year));
  }

  function appendCheckinRow(year, row) {
    return appendCheckinRowByTitle(checkinsTabTitle(year), row);
  }

  return {
    getMembersTabMeta,
    createMembersTab,
    listMemberRows,
    appendMemberRow,
    updateMemberRow,
    getGroupsTabMeta,
    createGroupsTab,
    listGroupRows,
    getMemberGroupsTabMeta,
    createMemberGroupsTab,
    listMemberGroupRows,
    appendMemberGroupRow,
    updateMemberGroupRow,
    getCheckinTabMeta,
    createCheckinTab,
    listCheckinRowsByTitle,
    appendCheckinRowByTitle,
    getCheckinsTabMeta,
    createCheckinsTab,
    listCheckinRows,
    appendCheckinRow,
  };
}
