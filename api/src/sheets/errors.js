export class SheetsError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'SheetsError';
    this.code = code;
    this.status = status;
  }
}

export function mapGoogleError(err) {
  const status = err?.code ?? err?.response?.status;
  const reason = err?.errors?.[0]?.reason ?? err?.response?.data?.error?.status;

  if (status === 403 || reason === 'PERMISSION_DENIED') {
    return new SheetsError(
      'sheets_forbidden',
      503,
      'Google Sheets permission denied',
    );
  }
  if (status === 404 || reason === 'NOT_FOUND') {
    return new SheetsError(
      'sheets_forbidden',
      503,
      'Spreadsheet or resource not found',
    );
  }
  if (status === 429 || reason === 'rateLimitExceeded') {
    return new SheetsError(
      'sheets_rate_limited',
      503,
      'Google Sheets read quota exceeded',
    );
  }
  if (status >= 500) {
    return new SheetsError(
      'sheets_unavailable',
      503,
      'Google Sheets temporarily unavailable',
    );
  }
  if (
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ETIMEDOUT'
  ) {
    return new SheetsError('sheets_unavailable', 503, 'Network error');
  }

  return new SheetsError(
    'sheets_unavailable',
    503,
    err?.message ?? 'Google Sheets error',
  );
}

export function sendSheetsError(res, err) {
  if (err instanceof SheetsError) {
    return res.status(err.status).json({ error: err.code });
  }
  return res.status(503).json({ error: 'sheets_unavailable' });
}
