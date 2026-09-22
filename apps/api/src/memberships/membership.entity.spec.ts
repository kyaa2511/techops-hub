import { getMetadataArgsStorage } from 'typeorm';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role.enum';

describe('Membership entity', () => {
  it('defines the application-owned roles', () => {
    expect(Object.values(MembershipRole)).toEqual(['OWNER', 'ADMIN', 'MEMBER']);
  });

  it('defines the user and organization uniqueness boundary', () => {
    const uniqueConstraint = getMetadataArgsStorage().uniques.find(
      (unique) =>
        unique.target === Membership &&
        unique.name === 'UQ_memberships_user_organization',
    );

    expect(uniqueConstraint?.columns).toEqual(['userId', 'organizationId']);
  });

  it('defines relationships to users and organizations', () => {
    const relations = getMetadataArgsStorage()
      .relations.filter((relation) => relation.target === Membership)
      .map((relation) => relation.propertyName);

    expect(relations).toEqual(expect.arrayContaining(['user', 'organization']));
  });
});
