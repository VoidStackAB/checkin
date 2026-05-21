export function parseMemberNames(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid_format' };
  }

  const firstName =
    typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName =
    typeof body.lastName === 'string' ? body.lastName.trim() : '';

  if (!firstName || !lastName) {
    return { error: 'invalid_format' };
  }

  return { firstName, lastName };
}
