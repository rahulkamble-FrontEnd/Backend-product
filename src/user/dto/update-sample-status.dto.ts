import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSampleStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['none', 'pending', 'ready', 'collected'])
  sampleStatus: 'none' | 'pending' | 'ready' | 'collected';
}
