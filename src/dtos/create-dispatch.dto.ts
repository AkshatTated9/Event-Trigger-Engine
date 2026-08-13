export class CreateDispatchDto {
  client_id: string;
  user_id: string;
  interview_id: number;
  scheduled_at: Date;
  status?: string;
  email?:string;
  phone?:string
}
