import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Owner } from "../entities/Owner";

const router = Router();
const ownerRepo = () => AppDataSource.getRepository(Owner);

// GET all owners
router.get("/", async (_req: Request, res: Response) => {
  const owners = await ownerRepo().find();
  res.json(owners);
});

// GET single owner by id (with their vehicles)
router.get("/:id", async (req: Request, res: Response) => {
  const owner = await ownerRepo().findOne({
    where: { owner_id: Number(req.params.id) },
    relations: ["vehicles"],
  });
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  res.json(owner);
});

// POST create new owner
router.post("/", async (req: Request, res: Response) => {
  try {
    const owner = ownerRepo().create(req.body);
    const saved = await ownerRepo().save(owner);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to create owner", error: err.message });
  }
});

// PUT update existing owner
router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const owner = await ownerRepo().findOneBy({ owner_id: id });
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  ownerRepo().merge(owner, req.body);
  try {
    const updated = await ownerRepo().save(owner);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update owner", error: err.message });
  }
});

// DELETE owner
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await ownerRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Owner not found" });
  res.status(204).send();
});

export default router;