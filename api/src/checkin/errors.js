export class MemberNotFoundError extends Error {
  constructor() {
    super('Member not found');
    this.name = 'MemberNotFoundError';
    this.code = 'member_not_found';
    this.status = 404;
  }
}

export class InvalidCheckinDateError extends Error {
  constructor() {
    super('Invalid check-in date');
    this.name = 'InvalidCheckinDateError';
    this.code = 'invalid_date';
    this.status = 400;
  }
}
