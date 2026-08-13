import { Entity , PrimaryGeneratedColumn , Column } from "typeorm";

@Entity()
export class Dispatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: string;

  @Column()
  user_id: string;

  @Column()
  interview_id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;
  
  @Column()
  scheduled_at: Date;

  @Column({ nullable: true })
  sent_at: Date;

  @Column()
  status: string;
}