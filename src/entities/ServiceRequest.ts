import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "service_requests" })
export class ServiceRequest {
  @PrimaryGeneratedColumn({ name: "request_id" })
  request_id!: number;

  @Column({ name: "full_name", type: "varchar", length: 100 })
  full_name!: string;

  @Column({ name: "phone", type: "varchar", length: 20 })
  phone!: string;

  @Column({ name: "message", type: "varchar", length: 500, nullable: true })
  message?: string;

  @Column({ name: "status", type: "varchar", length: 20, default: "New" })
  status!: string;

  @Column({ name: "created_at", type: "timestamp" })
  created_at!: Date;
}