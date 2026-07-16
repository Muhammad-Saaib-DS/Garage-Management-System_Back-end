import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Service } from "./Service";

@Entity({ name: "employee" })
export class Employee {
  @PrimaryGeneratedColumn({ name: "employee_id" })
  employee_id!: number;

  @Column({ name: "full_name", type: "varchar", length: 100 })
  full_name!: string;

  @Column({ name: "phone", type: "varchar", length: 20, unique: true })
  phone!: string;

  @Column({ name: "role", type: "varchar", length: 50 })
  role!: string;

  @Column({ name: "salary", type: "decimal", precision: 10, scale: 2 })
  salary!: number;

  @Column({ name: "hire_date", type: "date" })
  hire_date!: string;

  @Column({ name: "username", type: "varchar", length: 50, nullable: true, unique: true })
username?: string | null;

@Column({ name: "password_hash", type: "varchar", length: 255, nullable: true })
password_hash?: string | null;

  @OneToMany(() => Service, (service) => service.employee)
  services!: Service[];
}