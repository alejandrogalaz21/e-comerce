import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from 'class-validator'

export function IsNotLessThan(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isNotLessThan',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProperty] = args.constraints as [string]
          const related = (args.object as Record<string, unknown>)[
            relatedProperty
          ]

          if (typeof value !== 'number' || typeof related !== 'number')
            return true

          return value >= related
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedProperty] = args.constraints as [string]
          return `$property must not be less than ${relatedProperty}`
        }
      }
    })
  }
}
