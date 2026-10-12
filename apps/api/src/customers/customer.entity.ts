import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'customers' })
@Index('IDX_customers_organization_created', [
  'organizationId',
  'createdAt',
  'id',
])
export class Customer {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') organizationId!: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Relation<Organization>;
  @Column({ length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 254, nullable: true }) email!:
    string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!:
    string | null;
  @Column({ type: 'varchar', length: 1000, nullable: true }) address!:
    string | null;
  @Column({ type: 'varchar', length: 5000, nullable: true }) notes!:
    string | null;
  @Column({
    type: 'enum',
    enum: CustomerStatus,
    enumName: 'customer_status_enum',
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}
