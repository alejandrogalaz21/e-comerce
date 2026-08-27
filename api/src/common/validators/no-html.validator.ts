import { registerDecorator, ValidationOptions } from 'class-validator'

const HTML_TAG_REGEX = /<[^>]*>/

export function NoHtml(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'noHtml',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value !== 'string' || !HTML_TAG_REGEX.test(value)
        },
        defaultMessage(): string {
          return '$property contains invalid content: HTML markup is not allowed'
        }
      }
    })
  }
}
