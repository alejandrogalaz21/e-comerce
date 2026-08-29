export const RANDOM_SOURCE = Symbol('RANDOM_SOURCE')

export interface RandomSource {
  /** A value in [0, 1). */
  next(): number
}

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random()
  }
}
