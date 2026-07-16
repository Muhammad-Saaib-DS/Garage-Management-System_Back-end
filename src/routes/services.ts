import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Service } from "../entities/Service";

const router = Router();
const serviceRepo = () => AppDataSource.getRepository(Service);

router.get("/", async (_req: Request, res: Response) => {
  const services = await serviceRepo().find({ relations: ["vehicle", "employee"] });
  res.json(services);
});

router.get("/:id", async (req: Request, res: Response) => {
  const service = await serviceRepo().findOne({
    where: { service_id: Number(req.params.id) },
    relations: ["vehicle", "vehicle.owner", "employee", "serviceParts", "serviceParts.part"],
  });
  if (!service) return res.status(404).json({ message: "Service not found" });
  res.json(service);
});

// POST expects: { vehicle_id, employee_id, service_date, description, labor_cost, status }
router.post("/", async (req: Request, res: Response) => {
  try {
    const service = serviceRepo().create(req.body);
    const saved = await serviceRepo().save(service);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create service", error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const service = await serviceRepo().findOneBy({ service_id: id });
  if (!service) return res.status(404).json({ message: "Service not found" });

  serviceRepo().merge(service, req.body);
  try {
    const updated = await serviceRepo().save(service);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update service", error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await serviceRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Service not found" });
  res.status(204).send();
});

export default router;