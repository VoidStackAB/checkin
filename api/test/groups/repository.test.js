import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMembersRepository } from '../../src/members/repository.js';
import { createGroupsRepository } from '../../src/groups/repository.js';
import { createCheckinRepository } from '../../src/checkin/repository.js';
import { createLeaderboardRepository } from '../../src/leaderboard/repository.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { GroupNotFoundError, NotInGroupError } from '../../src/groups/errors.js';
import { MemberNotFoundError } from '../../src/checkin/errors.js';

async function setup() {
  const adapter = createInMemorySheetsAdapter();
  const members = createMembersRepository(adapter);
  const groups = createGroupsRepository(adapter, members, {
    defaultGroupName: 'Klubben',
  });
  const leaderboard = createLeaderboardRepository(adapter, members);
  const checkins = createCheckinRepository(
    adapter,
    members,
    leaderboard,
    groups,
  );
  const member = await members.createMember({
    firstName: 'Anna',
    lastName: 'Test',
  });
  adapter._seedGroup({ groupId: 1, name: 'Måndagsträning' });
  adapter._seedGroup({ groupId: 2, name: 'Tävlingsgrupp' });
  return { adapter, members, groups, leaderboard, checkins, member };
}

function ids(groups) {
  return groups.map((g) => g.groupId);
}

describe('groups repository', () => {
  it('returns all groups with the member in default by default', async () => {
    const { groups, member } = await setup();
    const { groups: list } = await groups.getMemberGroups(member.memberId);
    assert.deepEqual(ids(list), ['default', '1', '2']);
    const def = list.find((g) => g.isDefault);
    assert.equal(def.name, 'Klubben');
    assert.equal(def.isMember, true);
    assert.equal(list.find((g) => g.groupId === '1').isMember, false);
  });

  it('join and leave an extra group', async () => {
    const { groups, member } = await setup();
    const afterJoin = await groups.joinGroup(member.memberId, '1');
    assert.equal(
      afterJoin.groups.find((g) => g.groupId === '1').isMember,
      true,
    );

    const afterLeave = await groups.leaveGroup(member.memberId, '1');
    assert.equal(
      afterLeave.groups.find((g) => g.groupId === '1').isMember,
      false,
    );
  });

  it('member can leave and rejoin the default group', async () => {
    const { groups, member } = await setup();
    const left = await groups.leaveGroup(member.memberId, 'default');
    assert.equal(left.groups.find((g) => g.isDefault).isMember, false);
    assert.equal(await groups.isMemberInGroup(member.memberId, 'default'), false);

    const rejoined = await groups.joinGroup(member.memberId, 'default');
    assert.equal(rejoined.groups.find((g) => g.isDefault).isMember, true);
  });

  it('keeps extra membership when leaving default', async () => {
    const { groups, member } = await setup();
    await groups.joinGroup(member.memberId, '1');
    await groups.leaveGroup(member.memberId, 'default');
    const { groups: list } = await groups.getMemberGroups(member.memberId);
    assert.equal(list.find((g) => g.isDefault).isMember, false);
    assert.equal(list.find((g) => g.groupId === '1').isMember, true);
  });

  it('throws for unknown group on join', async () => {
    const { groups, member } = await setup();
    await assert.rejects(
      () => groups.joinGroup(member.memberId, '99'),
      (err) => err instanceof GroupNotFoundError,
    );
  });

  it('throws for unknown member', async () => {
    const { groups } = await setup();
    await assert.rejects(
      () => groups.getMemberGroups('00000000-0000-4000-8000-000000000000'),
      (err) => err instanceof MemberNotFoundError,
    );
  });

  it('blocks default check-in after leaving default', async () => {
    const { groups, checkins, member } = await setup();
    await groups.leaveGroup(member.memberId, 'default');
    await assert.rejects(
      () =>
        checkins.checkIn({
          memberId: member.memberId,
          firstName: 'Anna',
          lastName: 'Test',
        }),
      (err) => err instanceof NotInGroupError,
    );
  });

  it('writes group check-ins to a separate tab', async () => {
    const { adapter, groups, checkins, member } = await setup();
    await groups.joinGroup(member.memberId, '1');
    const now = new Date('2026-05-21T12:00:00Z');
    const result = await checkins.checkIn(
      {
        memberId: member.memberId,
        firstName: 'Anna',
        lastName: 'Test',
        groupId: '1',
      },
      now,
    );
    assert.equal(result.status, 'checked_in');
    assert.equal(result.groupId, '1');
    const groupTab = adapter._checkinTabSnapshot('group1_2026');
    assert.equal(groupTab.rows.length, 1);
    assert.equal(adapter._checkinTabSnapshot('checkins_2026'), null);
  });

  it('rejects group check-in when not a member', async () => {
    const { checkins, member } = await setup();
    await assert.rejects(
      () =>
        checkins.checkIn({
          memberId: member.memberId,
          firstName: 'Anna',
          lastName: 'Test',
          groupId: '1',
        }),
      (err) => err instanceof NotInGroupError,
    );
  });

  it('leaderboard is computed per group', async () => {
    const { groups, checkins, leaderboard, member } = await setup();
    await groups.joinGroup(member.memberId, '1');
    const now = new Date('2026-05-21T12:00:00Z');
    await checkins.checkIn(
      {
        memberId: member.memberId,
        firstName: 'Anna',
        lastName: 'Test',
        groupId: '1',
      },
      now,
    );

    const defaultBoard = await leaderboard.getPublicLeaderboard(now, 'default');
    assert.equal(defaultBoard.entries.length, 0);

    const groupBoard = await leaderboard.getPublicLeaderboard(now, '1');
    assert.equal(groupBoard.entries.length, 1);
    assert.equal(groupBoard.entries[0].firstName, 'Anna');
    assert.equal(groupBoard.entries[0].yearCount, 1);
  });
});
