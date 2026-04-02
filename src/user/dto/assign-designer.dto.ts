import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignDesignerDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  designerId: string;
}
