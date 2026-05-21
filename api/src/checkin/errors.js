export class MemberNotFoundError extends Error {
  constructor() {
    super('Member not found');
    this.name = 'MemberNotFoundError';
    this.code = 'member_not_found';
    this.status = 404;
  }
}
