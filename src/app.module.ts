import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientEntity } from './entities/client.entity';
import { Interview } from './entities/interview.entity';
import { Rule } from './entities/rule.entity';
import { Events } from './entities/event.entity';
import { Dispatch } from './entities/dispatch.entity';
import { AuthController } from './controllers/auth.controller';
import { InterviewsController } from './controllers/interviews.controller';
import { EventsController } from './controllers/events.controller';
import { AuthService } from './services/authservice.service';
import { InterviewService } from './services/interview.service';
import { EventService } from './services/event.service';
import { JwtGuard } from './guards/jwt.guard';
import { RulesController } from './controllers/rules.controller';
import { RuleService } from './services/rule.service';
import { DispatchService } from './services/dispatch.service';
import { CronService } from './services/cron.service';
import { EventProcessor } from './processors/event.processor';
import { setupEventListener } from './services/eventlisterner.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [ClientEntity, Interview, Rule, Events, Dispatch],
      synchronize: true,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    TypeOrmModule.forFeature([ClientEntity, Interview, Rule, Events, Dispatch]),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
    BullModule.registerQueue({ name: 'processing' ,defaultJobOptions: {
    removeOnComplete: {
      age: 5 * 60
    },
    removeOnFail: false,
    },}),
  ],
  controllers: [
    AppController,
    AuthController,
    InterviewsController,
    EventsController,
    RulesController,
  ],
  providers: [
    AppService,
    AuthService,
    InterviewService,
    EventService,
    JwtGuard,
    RuleService,
    DispatchService,
    CronService,
    EventProcessor,
    {
      provide: 'EVENT_LISTENER',
      useFactory: (eventService: EventService) => {
        setupEventListener(eventService);
        return {};
      },
      inject: [EventService],
    },
  ],
})
export class AppModule {}

