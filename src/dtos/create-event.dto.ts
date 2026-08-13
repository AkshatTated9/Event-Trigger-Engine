import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString({ message: 'event_name must be a string' })
  @IsNotEmpty({ message: 'event_name is required' })
  event_name: string;

  @IsString({ message: 'user_id must be a string' })
  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  phone?: string;

  @IsOptional()
  properties?: Record<string, unknown>;

  @IsDateString({}, { message: 'timestamp must be an ISO 8601 date string' })
  timestamp: string;
}
