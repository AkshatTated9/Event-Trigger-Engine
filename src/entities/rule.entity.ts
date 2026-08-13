import { Entity,PrimaryGeneratedColumn , Column , ManyToOne  } from "typeorm";

@Entity()
export class Rule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: string;

  @Column()
  event_name: string;

  @Column()
  interview_id: number;

  @Column()
  delay: number;

  @Column()
  sample_percentage: number;

  @Column()
  dedup_window: number;
}