import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Vehicle } from "./Vehicle";
import { Employee } from "./Employee";
import { ServicePart } from "./ServicePart";

@Entity({ name: "services" })
export class Service {
  @PrimaryGeneratedColumn({ name: "service_id" })
  service_id!: number;

  @Column({ name: "vehicle_id" })
  vehicle_id!: number;

  @Column({ name: "employee_id" })
  employee_id!: number;

  @Column({ name: "service_date", type: "date" })
  service_date!: string;

  @Column({ name: "description", type: "varchar", length: 255, nullable: true })
  description?: string;

  @Column({ name: "labor_cost", type: "decimal", precision: 10, scale: 2, default: 0 })
  labor_cost!: number;

  @Column({ name: "status", type: "varchar", length: 20, default: "Pending" })
  status!: string;

  @Column({ name: "tax_percent", type: "decimal", precision: 5, scale: 2, default: 0 })
  tax_percent!: number;

  @Column({ name: "discount_amount", type: "decimal", precision: 10, scale: 2, default: 0 })
  discount_amount!: number;

  @Column({ name: "payment_method", type: "varchar", length: 30, nullable: true })
  payment_method!: string | null;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.services, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vehicle_id" })
  vehicle!: Vehicle;

  @ManyToOne(() => Employee, (employee) => employee.services, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @OneToMany(() => ServicePart, (sp) => sp.service)
  serviceParts!: ServicePart[];
}