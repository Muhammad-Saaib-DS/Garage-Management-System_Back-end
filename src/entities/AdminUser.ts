import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "admins" })
export class AdminUser {
  @PrimaryGeneratedColumn({ name: "admin_id" })
  admin_id!: number;

  @Column({ name: "username", type: "varchar", length: 50, unique: true })
  username!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  password_hash!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  created_at!: Date;
}