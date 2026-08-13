import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentClient = createParamDecorator(
  (_data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.client;
  },
);
