import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Vehicle } from "../entities/Vehicle";

const router = Router();
const vehicleRepo = () => AppDataSource.getRepository(Vehicle);

router.get("/", async (_req: Request, res: Response) => {
  const vehicles = await vehicleRepo().find({ relations: ["owner"] });
  res.json(vehicles);
});

router.get("/:id", async (req: Request, res: Response) => {
  const vehicle = await vehicleRepo().findOne({
    where: { vehicle_id: Number(req.params.id) },
    relations: ["owner", "services"],
  });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
  res.json(vehicle);
});

// POST expects: { owner_id, make, model, year, vin, license_plate }
router.post("/", async (req: Request, res: Response) => {
  try {
    const vehicle = vehicleRepo().create(req.body);
    const saved = await vehicleRepo().save(vehicle);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create vehicle", error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const vehicle = await vehicleRepo().findOneBy({ vehicle_id: id });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  vehicleRepo().merge(vehicle, req.body);
  try {
    const updated = await vehicleRepo().save(vehicle);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update vehicle", error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await vehicleRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Vehicle not found" });
  res.status(204).send();
});

export default router;
