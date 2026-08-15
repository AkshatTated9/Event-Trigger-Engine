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
import { CreateRuleDto } from 'src/dtos/create-rule.dto';
import { RuleService } from 'src/services/rule.service';
import { swaggerExamples } from 'src/swagger/samplebody';

@ApiTags('Rules')
@ApiBearerAuth('token')
@Controller('rules')
export class RulesController {
  constructor(private readonly ruleService: RuleService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create Rule', description: 'Create a dispatch rule linking an event to an interview configuration' })
  @ApiBody({
    description: 'Rule configuration payload',
    examples: {
      interviewConfig: swaggerExamples.interviewConfig,
    },
  })
  @ApiCreatedResponse({ description: 'Rule created successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async createRule(@Body() body: CreateRuleDto,@CurrentClient() client) {
    return this.ruleService.createRule(body,client);
  }
}
