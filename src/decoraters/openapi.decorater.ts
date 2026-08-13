import { SetMetadata } from '@nestjs/common';

export const OpenApi = () => SetMetadata('isPublic', true);
