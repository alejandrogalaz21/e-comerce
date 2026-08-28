import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface AuthenticatedUser {
  userId: string
  email: string
}

export const currentUserFactory = (
  property: keyof AuthenticatedUser | undefined,
  context: ExecutionContext
) => {
  const request = context
    .switchToHttp()
    .getRequest<{ user?: AuthenticatedUser }>()
  const user = request.user

  if (!user) return undefined

  return property ? user[property] : user
}

export const CurrentUser = createParamDecorator(currentUserFactory)
