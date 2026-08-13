import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateEventDto } from 'src/dtos/create-event.dto';
import { EventService } from 'src/services/event.service';
import { CurrentClient } from 'src/decoraters/currentclient.decorater';
import { swaggerExamples } from 'src/swagger/samplebody';

@ApiTags('Events')
@ApiBearerAuth('token')
@Controller('event')
export class EventsController {
  constructor(private readonly eventService: EventService) {}

  @Post('created')
  @ApiOperation({ summary: 'Create Event', description: 'Ingest a new event for the authenticated client' })
  @ApiBody({
    description: 'Event payload',
    examples: {
      interviewScheduledEvent: swaggerExamples.interviewScheduledEvent,
    },
  })
  @ApiCreatedResponse({
    description: 'Event created successfully',
    schema: { example: { success: true } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async createEvent(@Body() body: CreateEventDto, @CurrentClient() client) {
    const clientId = client?.client_id;
    if (!clientId) {
      throw new HttpException('Authenticated client_id is missing', HttpStatus.UNAUTHORIZED);
    }
    await this.eventService.createEvent(clientId, body);

    return { success: true };
  }
}
