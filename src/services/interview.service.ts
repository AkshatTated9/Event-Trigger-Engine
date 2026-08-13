import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from 'src/entities/interview.entity';
import { CreateInterviewDto } from 'src/dtos/create-interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
  ) {}

  async createInterview(dto,client) {
    dto.created_by=client.client_id;
    const interview = this.interviewRepository.create(dto);
    this.interviewRepository.save(interview);
    return {message:"Interview Created"}
  }
}
