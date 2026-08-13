import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentClient } from 'src/decoraters/currentclient.decorater';
import { CreateInterviewDto } from 'src/dtos/create-interview.dto';
import { InterviewService } from 'src/services/interview.service';
import { swaggerExamples } from 'src/swagger/samplebody';

@ApiTags('Interviews')
@ApiBearerAuth('token')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create Interview', description: 'Create an interview configuration for the authenticated client' })
  @ApiBody({
    description: 'Interview configuration payload',
    examples: {
      listenery: swaggerExamples.listenery,
    },
  })
  @ApiCreatedResponse({ description: 'Interview configuration created successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async createInterview(@Body() body: CreateInterviewDto, @CurrentClient() client) {
    return this.interviewService.createInterview(body, client);
  }
}
