import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule } from 'src/entities/rule.entity';
import { CreateRuleDto } from 'src/dtos/create-rule.dto';

@Injectable()
export class RuleService {
  constructor(
    @InjectRepository(Rule)
    private readonly ruleRepository: Repository<Rule>,
  ) {}

  async createRule(dto: CreateRuleDto,client) {
    let client_id=client.client_id;
    const rule = this.ruleRepository.create({...dto,client_id});
    let rulecreated=await this. ruleRepository.save(rule);
    if(rulecreated){
        return {message:"Rule created successfully"}
    }
    else{
        throw new HttpException('Issue in creating rule',HttpStatus.BAD_REQUEST)
    }
  }
}
