import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from 'src/entities/client.entity';
import { RegisterClientDto } from 'src/dtos/register-client.dto';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientrepo: Repository<ClientEntity>,
  ) { }

  async registerClient(body:RegisterClientDto) {
    const existingClient = await this.clientrepo.findOne({
      where: {
        email: body.email,
      },
    });

    if (existingClient) {
      throw new HttpException(
        `ClientEntity already exists with ${body.email}`,
        HttpStatus.CONFLICT,
      );
    }

    let api_key = await jwt.sign({
      name: body.name,
      email: body.email,
    }, process.env.secret)
    
    const client = this.clientrepo.create({...body,api_key});
    const registeredClient = await this.clientrepo.save(client);

    const payload = {
      client_id: registeredClient.id,
    };

    return jwt.sign(payload, process.env.secret);
  }
}
