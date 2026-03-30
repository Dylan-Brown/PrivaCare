import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Medication, SkincareProduct } from "@/context/AppContext";
import type { AdherenceItem } from "./adherence";
import { todayString } from "./scheduleCompute";

function adherenceBar(pct: number, color: string): string {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return `<span style="color:${color}">${"█".repeat(filled)}</span><span style="color:#e0e0e0">${"░".repeat(empty)}</span>`;
}

function section(title: string, rows: string[], accentColor: string): string {
  if (rows.length === 0) return "";
  return `
    <div class="section">
      <h2 style="border-bottom: 2px solid ${accentColor}; color: ${accentColor}; padding-bottom: 6px;">${title}</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Start Date</th>
            <th>Tracked Days</th>
            <th>Missed Days</th>
            <th>Adherence</th>
            <th>Longest Streak</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>`;
}

function medMetaSection(medications: Medication[]): string {
  const active = medications.filter(m => m.status === "active");
  if (active.length === 0) return "";
  const rows = active.map(m => `
    <tr>
      <td><strong>${m.name}</strong>${m.brandName ? `<br/><small>${m.brandName}</small>` : ""}</td>
      <td>${m.dosage} ${m.isCompound ? "" : m.unit}</td>
      <td>${m.category ?? "—"}</td>
      <td>${m.notes ?? "—"}</td>
    </tr>`).join("");
  return `
    <div class="section">
      <h2 style="border-bottom: 2px solid #34C78B; color: #34C78B; padding-bottom: 6px;">Medication Details</h2>
      <table>
        <thead><tr><th>Name</th><th>Dosage</th><th>Category</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function skincareMetaSection(products: SkincareProduct[]): string {
  const active = products.filter(p => (!("status" in p) || (p as any).status !== "history"));
  if (active.length === 0) return "";
  const rows = active.map(p => `
    <tr>
      <td><strong>${p.name}</strong>${p.brand ? `<br/><small>${p.brand}</small>` : ""}</td>
      <td>${p.type ?? "—"}</td>
      <td>${p.expiryDate ?? "—"}</td>
      <td>${(p as any).notes ?? "—"}</td>
    </tr>`).join("");
  return `
    <div class="section">
      <h2 style="border-bottom: 2px solid #A78BFA; color: #A78BFA; padding-bottom: 6px;">Skincare Product Details</h2>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Expiry</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export async function generateAndSharePDF(
  medications: Medication[],
  skincareProducts: SkincareProduct[],
  medAdherence: AdherenceItem[],
  skincareAdherence: AdherenceItem[],
): Promise<{ success: boolean; message: string }> {
  try {
    const today = todayString();
    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const medRows = medAdherence.map(a => `
      <tr>
        <td><strong>${a.itemName}</strong></td>
        <td>${a.startDate}</td>
        <td>${a.expectedDays}</td>
        <td>${a.missedDays}</td>
        <td>${adherenceBar(a.adherencePct, "#34C78B")} <strong>${a.adherencePct}%</strong></td>
        <td>${a.longestStreak} day${a.longestStreak !== 1 ? "s" : ""}</td>
      </tr>`).join("");

    const skincareRows = skincareAdherence.map(a => `
      <tr>
        <td><strong>${a.itemName}</strong></td>
        <td>${a.startDate}</td>
        <td>${a.expectedDays}</td>
        <td>${a.missedDays}</td>
        <td>${adherenceBar(a.adherencePct, "#A78BFA")} <strong>${a.adherencePct}%</strong></td>
        <td>${a.longestStreak} day${a.longestStreak !== 1 ? "s" : ""}</td>
      </tr>`).join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .header h1 { font-size: 28px; font-weight: 700; color: #34C78B; margin-bottom: 6px; }
    .header p { color: #888; font-size: 13px; }
    .section { margin-bottom: 32px; }
    h2 { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 8px 10px; background: #f8f8f8; border-bottom: 2px solid #eee; font-weight: 600; color: #555; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .disclaimer { margin-top: 40px; padding: 16px; background: #f8f8f8; border-radius: 8px; font-size: 11px; color: #888; line-height: 1.5; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #bbb; }
    small { font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Vital — Health Report</h1>
    <p>Generated ${generatedDate} · All data is from your device only</p>
  </div>

  ${section("Medication Adherence", medRows.length > 0 ? [medRows] : [], "#34C78B")}
  ${section("Skincare Adherence", skincareRows.length > 0 ? [skincareRows] : [], "#A78BFA")}
  ${medMetaSection(medications)}
  ${skincareMetaSection(skincareProducts)}

  <div class="disclaimer">
    <strong>Medical Disclaimer:</strong> This report is generated from self-reported tracking data. It is not a clinical record and should not be used as medical advice. Always consult your healthcare provider regarding your medications and skincare.
  </div>
  <div class="footer">Vital — 100% private, all data on-device · ${today}</div>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Vital Health Report",
        UTI: "com.adobe.pdf",
      });
      return { success: true, message: "PDF ready to share." };
    }
    return { success: true, message: "PDF saved to device." };
  } catch (err: any) {
    return { success: false, message: err?.message ?? "Failed to generate PDF." };
  }
}
