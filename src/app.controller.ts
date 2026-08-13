import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { OpenApi } from './decoraters/openapi.decorater';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @OpenApi()
  @Get()
  @ApiOperation({ summary: 'Health Check', description: 'Returns a simple message to verify the server is running' })
  @ApiOkResponse({
    description: 'Server is healthy',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
