import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddAwsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hostname: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsString()
  @IsNotEmpty()
  sshUser: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  sshPort: number = 22;

  @IsOptional()
  @IsString()
  passphrase?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;
}
