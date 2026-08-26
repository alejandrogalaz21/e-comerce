import { PipeTransform } from '@nestjs/common'

export class TrimAndLowercaseSelectedPipe implements PipeTransform {
  transform(value: any) {
    const exclude = ['password']
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach(key => {
        if (typeof value[key] === 'string' && !exclude.includes(key)) {
          value[key] = value[key].trim().toLowerCase()
        }
      })
    }
    console.log('🔥 Pipe executed, transformed value:', value)
    return value
  }
}
