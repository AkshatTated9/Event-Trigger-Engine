import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Dispatch } from 'src/entities/dispatch.entity';

@Injectable()
export class CronService {
  private logger = new Logger(CronService.name);

  constructor(
    @InjectQueue('processing') private readonly queue: Queue,
    @InjectRepository(Dispatch)
    private readonly dispatchRepository: Repository<Dispatch>,
  ) {}

  
  @Cron('0 */6 * * *')
  async processDueDispatches(): Promise<void> {
    try {
      const now = new Date();
      const in6Hours = new Date(Date.now() + 6 * 60 * 60 * 1000);

      const dueDispatches = await this.dispatchRepository.find({
        where: {
          scheduled_at: LessThanOrEqual(in6Hours),
          sent_at: IsNull(),
          status: 'scheduled',
        },
      });

      console.log(`Found ${dueDispatches.length} dispatches due in next 6 hours`);

      for (const dispatch of dueDispatches) {
        const delayMs = dispatch.scheduled_at.getTime() - now.getTime();
        const delay = Math.max(0, delayMs);

        console.log(
          `Adding dispatch ${dispatch.id} to queue with delay ${delay}ms (scheduled for ${dispatch.scheduled_at.toISOString()})`,
        );
        await this.queue.add(
          'send-dispatch',
          { dispatchId: dispatch.id },
          {
            delay,
            jobId: `dispatch-${dispatch.id}`,
          },
        );
      }

      console.log('Cron job completed successfully');
    } catch (err) {
      console.error('Error in cron job:', err);
    }
  }
}
