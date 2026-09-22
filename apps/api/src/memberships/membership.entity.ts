import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { MembershipRole } from './membership-role.enum';

@Entity({ name: 'memberships' })
@Unique('UQ_memberships_user_organization', ['userId', 'organizationId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_memberships_user_id')
  @Column('uuid')
  userId!: string;

  @Index('IDX_memberships_organization_id')
  @Column('uuid')
  organizationId!: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
    enumName: 'membership_role_enum',
    default: MembershipRole.MEMBER,
  })
  role!: MembershipRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: User;

  @ManyToOne(() => Organization, (organization) => organization.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId', referencedColumnName: 'id' })
  organization!: Organization;
}
