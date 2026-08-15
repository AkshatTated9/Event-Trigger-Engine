import { IsNotEmpty, IsString, IsInt, Max, Min } from 'class-validator';

export class CreateRuleDto {

  @IsString({ message: 'event_name must be a string' })
  @IsNotEmpty({ message: 'event_name is required' })
  event_name: string;

  @IsInt({ message: 'interview_id must be an integer' })
  interview_id: number;

  @IsInt({ message: 'delay must be an integer' })
  @Min(0, { message: 'delay must be zero or positive' })
  delay: number;

  @IsInt({ message: 'sample_percentage must be an integer' })
  @Min(0, { message: 'sample_percentage must be at least 0' })
  @Max(100, { message: 'sample_percentage must be at most 100' })
  sample_percentage: number;

  @IsInt({ message: 'dedup_window must be an integer' })
  @Min(0, { message: 'dedup_window must be zero or positive' })
  dedup_window: number;
}
