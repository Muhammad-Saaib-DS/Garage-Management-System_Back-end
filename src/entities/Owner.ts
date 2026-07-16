import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Vehicle } from "./Vehicle";

@Entity({ name: "owners" })
export class Owner {
  @PrimaryGeneratedColumn({ name: "owner_id" })
  owner_id!: number;

  @Column({ name: "full_name", type: "varchar", length: 100 })
  full_name!: string;

  @Column({ name: "phone", type: "varchar", length: 20, unique: true })
  phone!: string;

  @Column({ name: "email", type: "varchar", length: 100, nullable: true, unique: true })
  email?: string;

  @Column({ name: "address", type: "varchar", length: 200, nullable: true })
  address?: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.owner)
  vehicles!: Vehicle[];
}