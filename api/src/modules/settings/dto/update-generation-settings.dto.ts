import { IsInt, Max, Min } from 'class-validator';

export class UpdateGenerationSettingsDto {
  /**
   * Máximo de generaciones de color completo por cliente por hora.
   * 0 = sin límite.
   */
  @IsInt()
  @Min(0)
  @Max(1000)
  maxColorGenerationsPerHour: number;
}
