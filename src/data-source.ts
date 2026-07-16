import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Owner } from "./entities/Owner";
import { Employee } from "./entities/Employee";
import { Vehicle } from "./entities/Vehicle";
import { Part } from "./entities/Part";
import { Service } from "./entities/Service";
import { ServicePart } from "./entities/ServicePart";
import { ServiceRequest } from "./entities/ServiceRequest";
import { AdminUser } from "./entities/AdminUser";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "GMS",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [Owner, Employee, Vehicle, Part, Service, ServicePart, ServiceRequest, AdminUser],
});