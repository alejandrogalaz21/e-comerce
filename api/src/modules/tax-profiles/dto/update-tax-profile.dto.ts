import { PartialType } from '@nestjs/swagger'
import { CreateTaxProfileDto } from './create-tax-profile.dto'

export class UpdateTaxProfileDto extends PartialType(CreateTaxProfileDto) {}
