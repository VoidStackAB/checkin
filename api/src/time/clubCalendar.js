const DEFAULT_TIME_ZONE = 'Europe/Stockholm';

export function getClubTimeZone() {
  return process.env.TZ || DEFAULT_TIME_ZONE;
}

function dateTimeParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
}

/** @returns {string} e.g. 2026-05-21 */
export function calendarDateString(date = new Date(), timeZone = getClubTimeZone()) {
  const parts = dateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** @returns {number} e.g. 2026 */
export function calendarYear(date = new Date(), timeZone = getClubTimeZone()) {
  const parts = dateTimeParts(date, timeZone);
  return Number(parts.year);
}

/** @returns {string} e.g. 2026-05-21 16:32:01 */
export function formatTimestamp(date = new Date(), timeZone = getClubTimeZone()) {
  const parts = dateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
