import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";

const router = Router();

// Last 6 calendar months' labor revenue, grouped by service_date
const MONTHLY_LABOR_QUERY = `
  SELECT
    TO_CHAR(service_date, 'YYYY-MM') AS month,
    COALESCE(SUM(labor_cost), 0) AS labor_revenue,
    COUNT(*) AS service_count
  FROM services
  WHERE service_date >= CURRENT_DATE - INTERVAL '5 months'
  GROUP BY TO_CHAR(service_date, 'YYYY-MM')
`;

// Last 6 calendar months' parts revenue, grouped by the service's date
const MONTHLY_PARTS_QUERY = `
  SELECT
    TO_CHAR(s.service_date, 'YYYY-MM') AS month,
    COALESCE(SUM(p.unit_price * sp.quantity_used), 0) AS parts_revenue
  FROM service_parts sp
  JOIN parts p ON sp.part_id = p.part_id
  JOIN services s ON sp.service_id = s.service_id
  WHERE s.service_date >= CURRENT_DATE - INTERVAL '5 months'
  GROUP BY TO_CHAR(s.service_date, 'YYYY-MM')
`;

// Top 5 parts by revenue generated (join service_parts -> parts)
const TOP_PARTS_QUERY = `
  SELECT
    p.part_id,
    p.part_name,
    SUM(sp.quantity_used) AS quantity_sold,
    SUM(p.unit_price * sp.quantity_used) AS revenue
  FROM service_parts sp
  JOIN parts p ON sp.part_id = p.part_id
  GROUP BY p.part_id, p.part_name
  ORDER BY revenue DESC
  LIMIT 5
`;

// Per-employee: how many services, how much revenue (labor + their parts) they've generated
const EMPLOYEE_PERFORMANCE_QUERY = `
  SELECT
    e.employee_id,
    e.full_name,
    e.role,
    COUNT(s.service_id) AS services_count,
    COALESCE(SUM(s.labor_cost), 0) AS labor_revenue,
    COALESCE(SUM(pr.parts_revenue), 0) AS parts_revenue
  FROM employee e
  LEFT JOIN services s ON s.employee_id = e.employee_id
  LEFT JOIN (
    SELECT sp.service_id, SUM(p.unit_price * sp.quantity_used) AS parts_revenue
    FROM service_parts sp
    JOIN parts p ON sp.part_id = p.part_id
    GROUP BY sp.service_id
  ) pr ON pr.service_id = s.service_id
  GROUP BY e.employee_id, e.full_name, e.role
  ORDER BY (COALESCE(SUM(s.labor_cost), 0) + COALESCE(SUM(pr.parts_revenue), 0)) DESC
`;

const STATUS_BREAKDOWN_QUERY = `
  SELECT status, COUNT(*) AS count
  FROM services
  GROUP BY status
`;

// Builds the last 6 calendar months as 'YYYY-MM' keys, oldest first,
// so the chart always shows 6 points even if some months have no data.
function lastSixMonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

router.get("/overview", async (_req: Request, res: Response) => {
  try {
    const [laborRows, partsRows, topParts, employeePerformance, statusRows] = await Promise.all([
      AppDataSource.query(MONTHLY_LABOR_QUERY),
      AppDataSource.query(MONTHLY_PARTS_QUERY),
      AppDataSource.query(TOP_PARTS_QUERY),
      AppDataSource.query(EMPLOYEE_PERFORMANCE_QUERY),
      AppDataSource.query(STATUS_BREAKDOWN_QUERY),
    ]);

    const laborByMonth = new Map<string, { labor_revenue: number; service_count: number }>(
      laborRows.map((r: any) => [
        r.month,
        { labor_revenue: Number(r.labor_revenue), service_count: Number(r.service_count) },
      ])
    );
    const partsByMonth = new Map<string, number>(
      partsRows.map((r: any) => [r.month, Number(r.parts_revenue)])
    );

    const monthly_revenue = lastSixMonthKeys().map((key) => {
      const labor = laborByMonth.get(key)?.labor_revenue ?? 0;
      const parts = partsByMonth.get(key) ?? 0;
      return {
        month: key,
        label: monthLabel(key),
        labor_revenue: labor,
        parts_revenue: parts,
        total_revenue: labor + parts,
        service_count: laborByMonth.get(key)?.service_count ?? 0,
      };
    });

    const top_parts = topParts.map((r: any) => ({
      part_id: r.part_id,
      part_name: r.part_name,
      quantity_sold: Number(r.quantity_sold),
      revenue: Number(r.revenue),
    }));

    const employee_performance = employeePerformance.map((r: any) => ({
      employee_id: r.employee_id,
      full_name: r.full_name,
      role: r.role,
      services_count: Number(r.services_count),
      total_revenue: Number(r.labor_revenue) + Number(r.parts_revenue),
    }));

    const status_breakdown = statusRows.map((r: any) => ({
      status: r.status,
      count: Number(r.count),
    }));

    res.json({ monthly_revenue, top_parts, employee_performance, status_breakdown });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to compute analytics", error: err.message });
  }
});

export default router;