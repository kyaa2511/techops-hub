import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'connected' })
  database!: 'connected';

  @ApiProperty({ example: '2026-09-19T00:00:00.000Z' })
  timestamp!: string;
}
