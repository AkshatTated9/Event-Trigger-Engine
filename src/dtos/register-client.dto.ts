import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterClientDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty()
  name: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;
}
