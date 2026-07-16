import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Owner } from "./Owner";
import { Service } from "./Service";

@Entity({ name: "vehicles" })
export class Vehicle {
  @PrimaryGeneratedColumn({ name: "vehicle_id" })
  vehicle_id!: number;

  @Column({ name: "owner_id" })
  owner_id!: number;

  @Column({ name: "make", type: "varchar", length: 50 })
  make!: string;

  @Column({ name: "model", type: "varchar", length: 50 })
  model!: string;

  @Column({ name: "year", type: "int" })
  year!: number;

  @Column({ name: "vin", type: "varchar", length: 30, unique: true })
  vin!: string;

  @Column({ name: "license_plate", type: "varchar", length: 20, unique: true })
  license_plate!: string;

  @ManyToOne(() => Owner, (owner) => owner.vehicles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "owner_id" })
  owner!: Owner;

  @OneToMany(() => Service, (service) => service.vehicle)
  services!: Service[];
}