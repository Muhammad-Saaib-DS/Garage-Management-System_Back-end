import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Part } from "../entities/Part";

const router = Router();
const partRepo = () => AppDataSource.getRepository(Part);

router.get("/", async (_req: Request, res: Response) => {
  const parts = await partRepo().find();
  res.json(parts);
});

router.get("/:id", async (req: Request, res: Response) => {
  const part = await partRepo().findOneBy({ part_id: Number(req.params.id) });
  if (!part) return res.status(404).json({ message: "Part not found" });
  res.json(part);
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const part = partRepo().create(req.body);
    const saved = await partRepo().save(part);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create part", error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const part = await partRepo().findOneBy({ part_id: id });
  if (!part) return res.status(404).json({ message: "Part not found" });

  partRepo().merge(part, req.body);
  try {
    const updated = await partRepo().save(part);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update part", error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await partRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Part not found" });
  res.status(204).send();
});

export default router;