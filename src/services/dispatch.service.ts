import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Dispatch } from 'src/entities/dispatch.entity';
import { CreateDispatchDto } from 'src/dtos/create-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchRepository: Repository<Dispatch>,
  ) {}

  async createDispatch(dto: CreateDispatchDto): Promise<Dispatch> {
    const dispatch = this.dispatchRepository.create(dto);
    return this.dispatchRepository.save(dispatch);
  }

  async getDispatchById(id: number): Promise<Dispatch> {
    return this.dispatchRepository.findOne({ where: { id } });
  }

  async updateDispatchStatus(id: number, status: string, sentAt?: Date): Promise<void> {
    await this.dispatchRepository.update(
      { id },
      {
        status,
        sent_at: sentAt || null,
      },
    );
  }

  async getDueDispatches(futureDate: Date): Promise<Dispatch[]> {
    return this.dispatchRepository.find({
      where: {
        scheduled_at: LessThanOrEqual(futureDate),
        sent_at: IsNull(),
        status: 'scheduled',
      },
    });
  }

  /**
   * Sender stub: just log the payload, no actual email/SMS.
   * Returns success.
   */
  async sendDispatch(dispatch: Dispatch): Promise<boolean> {
    console.log('===== DISPATCH SENDER STUB =====');
    console.log(JSON.stringify({
      client_id: dispatch.client_id,
      user_id: dispatch.user_id,
      interview_id: dispatch.interview_id,
      scheduled_at: dispatch.scheduled_at,
      timestamp: new Date().toISOString(),
    }, null, 2));
    console.log('================================\n');

    return true;
  }

 
  async checkDeduplication(
    clientId: string,
    userId: string,
    interviewId: number,
    dedupWindowMs: number,
  ): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - dedupWindowMs);

    const existingDispatch = await this.dispatchRepository.findOne({
      where: {
        client_id: clientId,
        user_id: userId,
        interview_id: interviewId,
      },
      order: { sent_at: 'DESC' },
    });

    if (!existingDispatch || !existingDispatch.sent_at) {
      return true; 
    }

    return existingDispatch.sent_at < cutoffTime;
  }
}
