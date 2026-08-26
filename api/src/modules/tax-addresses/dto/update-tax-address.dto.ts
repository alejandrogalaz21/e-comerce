import { PartialType } from '@nestjs/swagger'
import { CreateTaxAddressDto } from './create-tax-address.dto'

export class UpdateTaxAddressDto extends PartialType(CreateTaxAddressDto) {}
