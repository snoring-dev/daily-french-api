import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  Length,
} from 'class-validator';
import { Ranking } from 'src/utils/word_ranking';

export class UpdateUserInfoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(2)
  languageLevel?: Ranking;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
    message: 'Phone number is not valid',
  })
  phoneNumber?: string;
}
