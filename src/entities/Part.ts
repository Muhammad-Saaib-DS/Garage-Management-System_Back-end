import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ServicePart } from "./ServicePart";

@Entity({ name: "parts" })
export class Part {
  @PrimaryGeneratedColumn({ name: "part_id" })
  part_id!: number;

  @Column({ name: "part_name", type: "varchar", length: 100 })
  part_name!: string;

  @Column({ name: "unit_price", type: "decimal", precision: 10, scale: 2 })
  unit_price!: number;

  @Column({ name: "quantity_in_stock", type: "int", default: 0 })
  quantity_in_stock!: number;

  @Column({ name: "supplier", type: "varchar", length: 100, nullable: true })
  supplier?: string;

  @OneToMany(() => ServicePart, (sp) => sp.part)
  serviceParts!: ServicePart[];
}