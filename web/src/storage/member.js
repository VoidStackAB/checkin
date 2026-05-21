const KEYS = ['memberId', 'firstName', 'lastName'];

export function hasMemberIdentity() {
  return KEYS.every((key) => {
    const value = localStorage.getItem(key);
    return typeof value === 'string' && value.length > 0;
  });
}

export function getMemberIdentity() {
  if (!hasMemberIdentity()) {
    return null;
  }
  return {
    memberId: localStorage.getItem('memberId'),
    firstName: localStorage.getItem('firstName'),
    lastName: localStorage.getItem('lastName'),
  };
}

export function setMemberIdentity({ memberId, firstName, lastName }) {
  localStorage.setItem('memberId', memberId);
  localStorage.setItem('firstName', firstName);
  localStorage.setItem('lastName', lastName);
}

export function clearMemberIdentity() {
  for (const key of KEYS) {
    localStorage.removeItem(key);
  }
}
