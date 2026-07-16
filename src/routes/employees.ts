import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";

const router = Router();
const employeeRepo = () => AppDataSource.getRepository(Employee);

router.get("/", async (_req: Request, res: Response) => {
  const employees = await employeeRepo().find();
  res.json(employees);
});

router.get("/:id", async (req: Request, res: Response) => {
  const employee = await employeeRepo().findOne({
    where: { employee_id: Number(req.params.id) },
    relations: { services: true },
  });
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
});

router.post("/", async (req: Request, res: Response) => {
  try { 
    const employee = employeeRepo().create(req.body);
    const saved = await employeeRepo().save(employee);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create employee", error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const employee = await employeeRepo().findOneBy({ employee_id: id });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  employeeRepo().merge(employee, req.body);
  try {
    const updated = await employeeRepo().save(employee);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update employee", error: err.message });
  }
});

router.patch("/:id/credentials", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const employee = await employeeRepo().findOneBy({ employee_id: id });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const existing = await employeeRepo().findOneBy({ username });
  if (existing && existing.employee_id !== id) {
    return res.status(409).json({ message: "That username is already taken" });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    employee.username = username;
    employee.password_hash = password_hash;
    const updated = await employeeRepo().save(employee);
    res.json({
      employee_id: updated.employee_id,
      username: updated.username,
      message: "Credentials set successfully",
    });
  } catch (err: any) {
    res.status(400).json({ message: "Failed to set credentials", error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await employeeRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Employee not found" });
  res.status(204).send();
});

export default router;