import { IsString, Length, Matches } from 'class-validator';

export class CreateOrganizationRequestDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters, numbers, and single hyphens between words',
  })
  slug!: string;
}
