import { PartialType } from '@nestjs/swagger'
import { CreateTaxActivityDto } from './create-tax-activity.dto'

export class UpdateTaxActivityDto extends PartialType(CreateTaxActivityDto) {}
