import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ServicePart } from "../entities/ServicePart";

const router = Router();
const servicePartRepo = () => AppDataSource.getRepository(ServicePart);

router.get("/", async (_req: Request, res: Response) => {
  const rows = await servicePartRepo().find({ relations: { service: true, part: true } });
  res.json(rows);
});

// GET a specific service_id + part_id combination
router.get("/:serviceId/:partId", async (req: Request, res: Response) => {
  const row = await servicePartRepo().findOne({
    where: {
      service_id: Number(req.params.serviceId),
      part_id: Number(req.params.partId),
    },
    relations: { service: true, part: true },
  });
  if (!row) return res.status(404).json({ message: "Record not found" });
  res.json(row);
});

// POST expects: { service_id, part_id, quantity_used }
router.post("/", async (req: Request, res: Response) => {
  try {
    const row = servicePartRepo().create(req.body);
    const saved = await servicePartRepo().save(row);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create record", error: err.message });
  }
});

// PUT update quantity_used for a given service_id + part_id pair
router.put("/:serviceId/:partId", async (req: Request, res: Response) => {
  const service_id = Number(req.params.serviceId);
  const part_id = Number(req.params.partId);
  const row = await servicePartRepo().findOneBy({ service_id, part_id });
  if (!row) return res.status(404).json({ message: "Record not found" });

  servicePartRepo().merge(row, req.body);
  try {
    const updated = await servicePartRepo().save(row);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update record", error: err.message });
  }
});

router.delete("/:serviceId/:partId", async (req: Request, res: Response) => {
  const service_id = Number(req.params.serviceId);
  const part_id = Number(req.params.partId);
  const result = await servicePartRepo().delete({ service_id, part_id });
  if (result.affected === 0) return res.status(404).json({ message: "Record not found" });
  res.status(204).send();
});

export default router;