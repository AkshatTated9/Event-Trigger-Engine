import { Entity , PrimaryGeneratedColumn , Column } from "typeorm";
@Entity()
export class Events {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: string;

  @Column()
  event_name: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  properties: object;

  @Column()
  timestamp: Date;
}