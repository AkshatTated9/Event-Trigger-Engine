import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OpenApi } from 'src/decoraters/openapi.decorater';
import { RegisterClientDto } from 'src/dtos/register-client.dto';
import { AuthService } from 'src/services/authservice.service';
import { swaggerExamples } from 'src/swagger/samplebody';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/client')
  @OpenApi()
  @ApiOperation({ summary: 'Register Client', description: 'Register a new client and receive a JWT token' })
  @ApiBody({
    description: 'Client registration payload',
    examples: {
      user: swaggerExamples.user,
    },
  })
  @ApiCreatedResponse({
    description: 'Client registered successfully',
    schema: {
      example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  async register(@Body() body: RegisterClientDto) {
    const token = await this.authService.registerClient(body);
    return { token };
  }
}
