import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Events } from 'src/entities/event.entity';
import { CreateEventDto } from 'src/dtos/create-event.dto';
import emitter from './eventhandler.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Rule } from 'src/entities/rule.entity';
import { Interview } from 'src/entities/interview.entity';
import { DispatchService } from './dispatch.service';
import { SamplingUtil } from 'src/utils/sampling.util';

@Injectable()
export class EventService {
  private logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Events)
    private readonly eventRepository: Repository<Events>,
    @InjectRepository(Rule)
    private readonly ruleRepository: Repository<Rule>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectQueue('processing')
    private readonly eventQueue: Queue,
    private readonly dispatchService: DispatchService,
  ) {}


  async createEvent(client_id: string, dto: CreateEventDto) {
    const timestamp = typeof dto.timestamp === 'string' ? new Date(dto.timestamp) : dto.timestamp;
    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException('timestamp must be a valid date');
    }

    const event = this.eventRepository.create({
      client_id,
      event_name: dto.event_name,
      user_id: dto.user_id,
      email: dto.email,
      phone: dto.phone,
      properties: dto.properties,
      timestamp,
    });

    const savedEvent = await this.eventRepository.save(event);
    console.log(`Event ${savedEvent.id} created for client ${client_id}`);
        emitter.emit('event-created', savedEvent);
    
    return { message: 'Event Created Successfully' };
  }


  async processEvent(clientId: string, event: Events): Promise<void> {
    console.log(`Processing event ${event.id} for client ${clientId}, event_name: ${event.event_name}`);


    const rules = await this.ruleRepository.find({
      where: {
        client_id: clientId,
        event_name: event.event_name,
      },
    });

    if (rules.length === 0) {
      console.log(`No rules found for client ${clientId} and event ${event.event_name}`);
      return;
    }

    console.log(`Found ${rules.length} rule(s) for client ${clientId} and event ${event.event_name}`);

    for (const rule of rules) {
      await this.checkAndCreateDispatch(clientId, event, rule);
    }
  }

  private async checkAndCreateDispatch(clientId: string, event: Events, rule: Rule): Promise<void> {
    const userId = event.user_id;
    const SIX_HOURS_SECONDS = 6 * 60 * 60;

    console.log(`Checking eligibility for rule ${rule.id}, user ${userId}`);


    const shouldSample = SamplingUtil.shouldIncludeUser(userId, rule.id, rule.sample_percentage);
    if (!shouldSample) {
      console.log(
        `User ${userId} filtered out by sampling (sample_percentage: ${rule.sample_percentage}%, rule ${rule.id})`,
      );
      return;
    }


    const dedupWindowMs = rule.dedup_window * 1000; // Convert seconds to ms
    const isEligible = await this.dispatchService.checkDeduplication(
      clientId,
      userId,
      rule.interview_id,
      dedupWindowMs,
    );

    if (!isEligible) {
      console.log(
        `User ${userId} already received interview ${rule.interview_id} within dedup window (${rule.dedup_window}s)`,
      );
      return;
    }

  
    const interview = await this.interviewRepository.findOne({
      where: { id: rule.interview_id },
    });
    if (!interview) {
      console.error(`Interview ${rule.interview_id} not found`);
      return;
    }


    const scheduledAt = new Date();
    scheduledAt.setSeconds(scheduledAt.getSeconds() + rule.delay);

  
    const dispatch = await this.dispatchService.createDispatch({
      client_id: clientId,
      user_id: userId,
      interview_id: rule.interview_id,
      scheduled_at: scheduledAt,
      status: 'scheduled',
      email: event.email,
      phone : event.phone
    });

    console.log(
      `Created dispatch ${dispatch.id} for user ${userId}, interview ${rule.interview_id}, scheduled for ${scheduledAt.toISOString()}`,
    );

    if (rule.delay <= SIX_HOURS_SECONDS) {
      const delayMs = rule.delay * 1000;
      console.log(
        `Adding dispatch ${dispatch.id} to queue with delay ${delayMs}ms (rule delay: ${rule.delay}s)`,
      );
      await this.eventQueue.add(
        'send-dispatch',
        { dispatchId: dispatch.id },
        {
          delay: delayMs,
          jobId: `dispatch-${dispatch.id}`,
        },
      );
    } else {
      console.log(
        `Dispatch ${dispatch.id} scheduled ${rule.delay}s from now (>6hrs); will be picked up by cron job`,
      );
    }
  }
}

