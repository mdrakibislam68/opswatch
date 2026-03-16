import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class AddSshDto {
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

  @IsString()
  @IsNotEmpty()
  @Matches(/^-----BEGIN\s[\w\s]+-----/, { message: 'privateKey must be a valid PEM-formatted private key' })
  privateKey: string;

  @IsOptional()
  @IsString()
  passphrase?: string;

  @IsOptional()
  @IsString()
  installPath?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;
}
