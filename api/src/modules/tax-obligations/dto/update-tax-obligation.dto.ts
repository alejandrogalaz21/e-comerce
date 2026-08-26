import { PartialType } from '@nestjs/swagger'
import { CreateTaxObligationDto } from './create-tax-obligation.dto'

export class UpdateTaxObligationDto extends PartialType(
  CreateTaxObligationDto
) {}
