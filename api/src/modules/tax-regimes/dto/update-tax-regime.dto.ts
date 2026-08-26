import { PartialType } from '@nestjs/swagger'
import { CreateTaxRegimeDto } from './create-tax-regime.dto'

export class UpdateTaxRegimeDto extends PartialType(CreateTaxRegimeDto) {}
