import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CustomerStatus } from './customer.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCustomerDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 254,
    format: 'email',
  })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 40 })
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  phone?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  address?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
  @ValidateIf((_, value) => value !== undefined)
  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
// Missing fields stay unchanged; only contact fields may explicitly be cleared with null.
export class UpdateCustomerDto extends PartialType(CreateCustomerDto, {
  skipNullProperties: false,
}) {}
export class ListCustomersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
