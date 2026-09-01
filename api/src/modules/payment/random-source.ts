export const RANDOM_SOURCE = Symbol('RANDOM_SOURCE')

export interface RandomSource {
  next(): number
}

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random()
  }
}
