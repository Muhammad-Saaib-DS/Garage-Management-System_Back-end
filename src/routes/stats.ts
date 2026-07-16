import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";

const router = Router();

// One round-trip, all stats computed via subqueries in Postgres itself —
// far cheaper than pulling every row into Node and counting in JS.
const STATS_QUERY = `
  SELECT
    (SELECT COUNT(*) FROM owners) AS total_owners,
    (SELECT COUNT(*) FROM employee) AS total_employees,
    (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
    (SELECT COUNT(*) FROM parts) AS total_parts,
    (SELECT COUNT(*) FROM services) AS total_services,
    (SELECT COUNT(*) FROM services WHERE status = 'Pending') AS pending_services,
    (SELECT COUNT(*) FROM services WHERE status = 'In Progress') AS in_progress_services,
    (SELECT COUNT(*) FROM services WHERE status = 'Completed') AS completed_services,
    (SELECT COUNT(*) FROM parts WHERE quantity_in_stock > 0 AND quantity_in_stock < 20) AS low_stock_parts,
    (SELECT COUNT(*) FROM parts WHERE quantity_in_stock = 0) AS out_of_stock_parts,
    (SELECT COUNT(*) FROM service_requests WHERE status = 'New') AS new_booking_requests,
    (SELECT COALESCE(SUM(labor_cost), 0) FROM services) AS total_labor_revenue,
    (SELECT COALESCE(SUM(p.unit_price * sp.quantity_used), 0)
       FROM service_parts sp JOIN parts p ON sp.part_id = p.part_id) AS total_parts_revenue,
    (SELECT COALESCE(SUM(labor_cost), 0) FROM services
       WHERE EXTRACT(MONTH FROM service_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM service_date) = EXTRACT(YEAR FROM CURRENT_DATE)) AS monthly_labor_revenue,
    (SELECT COALESCE(SUM(p.unit_price * sp.quantity_used), 0)
       FROM service_parts sp
       JOIN parts p ON sp.part_id = p.part_id
       JOIN services s ON sp.service_id = s.service_id
       WHERE EXTRACT(MONTH FROM s.service_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM s.service_date) = EXTRACT(YEAR FROM CURRENT_DATE)) AS monthly_parts_revenue,
    (SELECT COALESCE(SUM(labor_cost), 0) FROM services WHERE service_date = CURRENT_DATE) AS today_labor_revenue,
    (SELECT COALESCE(SUM(p.unit_price * sp.quantity_used), 0)
       FROM service_parts sp
       JOIN parts p ON sp.part_id = p.part_id
       JOIN services s ON sp.service_id = s.service_id
       WHERE s.service_date = CURRENT_DATE) AS today_parts_revenue
`;

const LOW_STOCK_ITEMS_QUERY = `
  SELECT part_id, part_name, quantity_in_stock
  FROM parts
  WHERE quantity_in_stock < 20
  ORDER BY quantity_in_stock ASC
  LIMIT 5
`;

router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const [statsRows, lowStockItems] = await Promise.all([
      AppDataSource.query(STATS_QUERY),
      AppDataSource.query(LOW_STOCK_ITEMS_QUERY),
    ]);
    const r = statsRows[0];

    res.json({
      total_owners: Number(r.total_owners),
      total_employees: Number(r.total_employees),
      total_vehicles: Number(r.total_vehicles),
      total_parts: Number(r.total_parts),
      total_services: Number(r.total_services),
      pending_services: Number(r.pending_services),
      in_progress_services: Number(r.in_progress_services),
      completed_services: Number(r.completed_services),
      low_stock_parts: Number(r.low_stock_parts),
      out_of_stock_parts: Number(r.out_of_stock_parts),
      new_booking_requests: Number(r.new_booking_requests),
      total_revenue: Number(r.total_labor_revenue) + Number(r.total_parts_revenue),
      monthly_revenue: Number(r.monthly_labor_revenue) + Number(r.monthly_parts_revenue),
      today_revenue: Number(r.today_labor_revenue) + Number(r.today_parts_revenue),
      low_stock_items: lowStockItems.map((item: any) => ({
        part_id: item.part_id,
        part_name: item.part_name,
        quantity_in_stock: item.quantity_in_stock,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to compute dashboard stats", error: err.message });
  }
});

export default router;