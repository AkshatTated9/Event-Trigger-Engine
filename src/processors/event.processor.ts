import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Dispatch } from 'src/entities/dispatch.entity';
import { DispatchService } from 'src/services/dispatch.service';

@Processor('processing')
export class EventProcessor extends WorkerHost {
  private logger = new Logger(EventProcessor.name);

  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'send-dispatch') {
      return this.sendDispatch(job.data);
    }

    throw new Error(`Unknown job type: ${job.name}`);
  }

  private async sendDispatch(data: any): Promise<void> {
    const { dispatchId } = data;
    let success;

    const dispatch = await this.dispatchService.getDispatchById(dispatchId);
    if (!dispatch) {
      console.error(`Dispatch ${dispatchId} not found`);
      return;
    }

    if(!dispatch.sent_at){
        success= await this.dispatchService.sendDispatch(dispatch);
    }

    console.log(`Sending dispatch ${dispatchId}...`);

    if (success) {
      await this.dispatchService.updateDispatchStatus(dispatchId, 'sent', new Date());
      console.log(`Dispatch ${dispatchId} sent successfully`);
    } else {
      await this.dispatchService.updateDispatchStatus(dispatchId, 'failed');
      console.error(`Failed to send dispatch ${dispatchId}`);
    }
  }
}
