import { PrimaryGeneratedColumn, Column, Entity , OneToMany} from "typeorm";
import { Rule } from "./rule.entity";
@Entity()
export class ClientEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    email: string;

    @Column()
    name: string

    @Column({ unique: true })
    api_key: string
}