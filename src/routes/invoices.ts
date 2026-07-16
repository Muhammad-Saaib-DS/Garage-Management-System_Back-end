import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const router = Router();

const COMPANY_NAME = process.env.COMPANY_NAME || "AutoCare Garage";
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || "123 Workshop Road, Islamabad";
const COMPANY_PHONE = process.env.COMPANY_PHONE || "+92 300 0000000";
const LOGO_PATH = path.join(__dirname, "../assets/logo.png");

function getLogoDataUri(): string {
  console.log("Looking for logo at:", LOGO_PATH);
  try {
    const buf = fs.readFileSync(LOGO_PATH);
    console.log("Logo loaded successfully, size:", buf.length, "bytes");
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err: any) {
    console.error("Logo failed to load:", err.message);
    return "";
  }
}
const INVOICE_DATA_QUERY = `
  SELECT
    s.service_id, s.service_date, s.description, s.labor_cost, s.status,
    s.tax_percent, s.discount_amount, s.payment_method,
    v.vehicle_id, v.make, v.model, v.year, v.vin, v.license_plate,
    o.owner_id, o.full_name AS owner_name, o.phone AS owner_phone,
    o.email AS owner_email, o.address AS owner_address,
    e.employee_id, e.full_name AS employee_name
  FROM services s
  JOIN vehicles v ON s.vehicle_id = v.vehicle_id
  JOIN owners o ON v.owner_id = o.owner_id
  LEFT JOIN employee e ON s.employee_id = e.employee_id
  WHERE s.service_id = $1
`;

const SERVICE_PARTS_QUERY = `
  SELECT p.part_name, sp.quantity_used, p.unit_price
  FROM service_parts sp
  JOIN parts p ON sp.part_id = p.part_id
  WHERE sp.service_id = $1
`;

// Save tax/discount/payment method before generating the PDF
router.patch("/:serviceId", async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const { tax_percent, discount_amount, payment_method } = req.body;
  try {
    await AppDataSource.query(
      `UPDATE services SET tax_percent = $1, discount_amount = $2, payment_method = $3 WHERE service_id = $4`,
      [tax_percent ?? 0, discount_amount ?? 0, payment_method ?? null, serviceId]
    );
    res.json({ message: "Invoice details saved" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to save invoice details", error: err.message });
  }
});

// Fetch the raw data the invoice form needs (used to populate the edit form)
router.get("/:serviceId/data", async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  try {
    const [rows, parts] = await Promise.all([
      AppDataSource.query(INVOICE_DATA_QUERY, [serviceId]),
      AppDataSource.query(SERVICE_PARTS_QUERY, [serviceId]),
    ]);
    if (!rows.length) return res.status(404).json({ message: "Service not found" });
    res.json({ service: rows[0], parts });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to load invoice data", error: err.message });
  }
});

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceHtml(service: any, parts: any[]): string {
  const partsRows = parts
    .map((p) => {
      const total = Number(p.unit_price) * Number(p.quantity_used);
      return `<tr>
        <td>${escapeHtml(p.part_name)}</td>
        <td class="num">${p.quantity_used}</td>
        <td class="num">Rs. ${Number(p.unit_price).toLocaleString()}</td>
        <td class="num">Rs. ${total.toLocaleString()}</td>
      </tr>`;
    })
    .join("");

  const partsSubtotal = parts.reduce(
    (sum, p) => sum + Number(p.unit_price) * Number(p.quantity_used),
    0
  );
  const laborCost = Number(service.labor_cost) || 0;
  const subtotal = partsSubtotal + laborCost;
  const taxPercent = Number(service.tax_percent) || 0;
  const taxAmount = subtotal * (taxPercent / 100);
  const discount = Number(service.discount_amount) || 0;
  const grandTotal = subtotal + taxAmount - discount;

  const invoiceNumber = `INV-${new Date(service.service_date).getFullYear()}-${String(
    service.service_id
  ).padStart(4, "0")}`;
  const dateStr = new Date(service.service_date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const logo = getLogoDataUri();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1A2332; margin: 0; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2F6FED; padding-bottom: 20px; margin-bottom: 24px; }
  .header__brand { display: flex; align-items: center; gap: 14px; }
  .header__brand img { height: 52px; }
  .header__company-name { font-size: 20px; font-weight: 700; }
  .header__company-meta { font-size: 11px; color: #64748B; margin-top: 2px; }
  .header__invoice-meta { text-align: right; }
  .header__invoice-meta .invoice-label { font-size: 22px; font-weight: 700; color: #2F6FED; letter-spacing: 0.04em; }
  .header__invoice-meta div { font-size: 12px; margin-top: 4px; color: #475569; }
  .parties { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 26px; }
  .parties__block { flex: 1; }
  .parties__block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94A3B8; margin: 0 0 6px; }
  .parties__block p { margin: 2px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #F1F5F9; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; padding: 10px 12px; }
  thead th.num, td.num { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; }
  .totals { width: 280px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 13px; }
  .totals .grand { font-size: 16px; font-weight: 700; border-top: 2px solid #1A2332; margin-top: 6px; padding-top: 10px; }
  .totals .discount { color: #E5484D; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
</style>
</head>
<body>
  <div class="header">
    <div class="header__brand">
      ${logo ? `<img src="${logo}" />` : ""}
      <div>
        <div class="header__company-name">${escapeHtml(COMPANY_NAME)}</div>
        <div class="header__company-meta">${escapeHtml(COMPANY_ADDRESS)}<br/>${escapeHtml(COMPANY_PHONE)}</div>
      </div>
    </div>
    <div class="header__invoice-meta">
      <div class="invoice-label">INVOICE</div>
      <div><strong>${invoiceNumber}</strong></div>
      <div>Date: ${dateStr}</div>
      <div>Status: ${escapeHtml(service.status)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="parties__block">
      <h4>Billed To</h4>
      <p><strong>${escapeHtml(service.owner_name)}</strong></p>
      <p>${escapeHtml(service.owner_phone || "")}</p>
      <p>${escapeHtml(service.owner_email || "")}</p>
      <p>${escapeHtml(service.owner_address || "")}</p>
    </div>
    <div class="parties__block">
      <h4>Vehicle</h4>
      <p><strong>${escapeHtml(service.make)} ${escapeHtml(service.model)} (${service.year})</strong></p>
      <p>Plate: ${escapeHtml(service.license_plate)}</p>
      <p>VIN: ${escapeHtml(service.vin)}</p>
    </div>
    <div class="parties__block">
      <h4>Service</h4>
      <p>${escapeHtml(service.description || "—")}</p>
      <p>Technician: ${escapeHtml(service.employee_name || "—")}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>
      ${partsRows}
      <tr>
        <td>Labor</td>
        <td class="num">1</td>
        <td class="num">Rs. ${laborCost.toLocaleString()}</td>
        <td class="num">Rs. ${laborCost.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>Rs. ${subtotal.toLocaleString()}</span></div>
    <div><span>Tax (${taxPercent}%)</span><span>Rs. ${taxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
    <div class="discount"><span>Discount</span><span>- Rs. ${discount.toLocaleString()}</span></div>
    <div class="grand"><span>Grand Total</span><span>Rs. ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
  </div>

  <div class="footer">
    <div>Payment method: ${escapeHtml(service.payment_method || "Not specified")}</div>
    <div>Thank you for choosing ${escapeHtml(COMPANY_NAME)}.</div>
  </div>
</body>
</html>`;
}

router.get("/:serviceId/pdf", async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  let browser;
  try {
    const [rows, parts] = await Promise.all([
      AppDataSource.query(INVOICE_DATA_QUERY, [serviceId]),
      AppDataSource.query(SERVICE_PARTS_QUERY, [serviceId]),
    ]);
    if (!rows.length) return res.status(404).json({ message: "Service not found" });

    const html = buildInvoiceHtml(rows[0], parts);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" as any });
    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    const pdfBuffer = Buffer.from(pdfUint8Array);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Content-Disposition", `inline; filename=invoice-${serviceId}.pdf`);
    res.end(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to generate invoice PDF", error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

export default router;