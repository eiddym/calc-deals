import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDealSessionDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  contractGrossAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  companyPct!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  externalPct!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
