import { IsNotEmpty, IsString } from 'class-validator';

export class CreateInterviewDto {
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty()
  name: string;

  @IsString({ message: 'Interview Link must be a string' })
  @IsNotEmpty()
  link: string;
}
