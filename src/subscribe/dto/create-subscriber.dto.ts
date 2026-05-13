import { IsEmail, IsString } from 'class-validator';

export class CreateSubscriberDto {
  @IsEmail()
  @IsString()
  email: string;
}
