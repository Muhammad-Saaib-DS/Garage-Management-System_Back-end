import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ServiceRequest } from "../entities/ServiceRequest";
import { requireAuth, requireRole } from "../middleware/requireAuth";

const router = Router();
const requestRepo = () => AppDataSource.getRepository(ServiceRequest);

// GET all requests — staff only
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const requests = await requestRepo().find({ order: { created_at: "DESC" } });
  res.json(requests);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const request = await requestRepo().findOneBy({ request_id: Number(req.params.id) });
  if (!request) return res.status(404).json({ message: "Request not found" });
  res.json(request);
});

// POST — this is the PUBLIC endpoint the landing page contact form calls.
// Anyone can submit this without logging in, since it's how new customers reach out.
router.post("/", async (req: Request, res: Response) => {
  try {
    const { full_name, phone, message } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    const request = requestRepo().create({ full_name, phone, message, status: "New" });
    const saved = await requestRepo().save(request);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to submit request", error: err.message });
  }
});

// PUT — used by staff to update status (New -> Contacted -> Scheduled -> Closed)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const request = await requestRepo().findOneBy({ request_id: id });
  if (!request) return res.status(404).json({ message: "Request not found" });

  requestRepo().merge(request, req.body);
  try {
    const updated = await requestRepo().save(request);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: "Failed to update request", error: err.message });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await requestRepo().delete(id);
  if (result.affected === 0) return res.status(404).json({ message: "Request not found" });
  res.status(204).send();
});

export default router;