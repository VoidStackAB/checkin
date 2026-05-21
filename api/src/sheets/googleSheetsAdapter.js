import fs from 'node:fs';
import { google } from 'googleapis';
import { MEMBERS_TAB } from './constants.js';
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

  async function withGoogle(fn) {
    try {
      return await fn();
    } catch (err) {
      throw mapGoogleError(err);
    }
  }

  async function getSpreadsheet() {
    return withGoogle(() =>
      sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      }),
    );
  }

  async function getMembersTabMeta() {
    const spreadsheet = await getSpreadsheet();
    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === MEMBERS_TAB,
    );
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

  return {
    getMembersTabMeta,
    createMembersTab,
    listMemberRows,
    appendMemberRow,
  };
}
