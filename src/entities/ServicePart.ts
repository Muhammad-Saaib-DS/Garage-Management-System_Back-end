import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Service } from "./Service";
import { Part } from "./Part";

@Entity({ name: "service_parts" })
export class ServicePart {
  @PrimaryColumn({ name: "service_id" })
  service_id!: number;

  @PrimaryColumn({ name: "part_id" })
  part_id!: number;

  @Column({ name: "quantity_used", type: "int", default: 1 })
  quantity_used!: number;

  @ManyToOne(() => Service, (service) => service.serviceParts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "service_id" })
  service!: Service;

  @ManyToOne(() => Part, (part) => part.serviceParts, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "part_id" })
  part!: Part;
}