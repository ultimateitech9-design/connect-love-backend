import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDivorcedLeadDto {
  @IsIn(['second-marriage', 'serious-relationship', 'companionship', 'friendship-first'])
  relationshipGoal: string;

  @IsIn(['30-39', '40-49', '50-59', '60+'])
  ageRange: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city: string;

  @IsIn(['yes', 'no', 'open-to-discuss'])
  childrenPreference: string;
}
