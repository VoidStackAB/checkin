export class GroupNotFoundError extends Error {
  constructor() {
    super('Group not found');
    this.name = 'GroupNotFoundError';
    this.code = 'group_not_found';
  }
}

export class NotInGroupError extends Error {
  constructor() {
    super('Member is not in this group');
    this.name = 'NotInGroupError';
    this.code = 'not_in_group';
  }
}
