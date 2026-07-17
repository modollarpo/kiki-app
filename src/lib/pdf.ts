/**
 * PDF generation utility — uses dynamic import of jsPDF to avoid SSR crashes.
 * All callers are "use client" components, but dynamic import ensures
 * jsPDF (which references browser globals) is never evaluated server-side.
 */

async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

export async function generatePDF(opts: {
  filename: string;
  title: string;
  content?: string[];
  sections?: { heading: string; body: string[] }[];
  metadata?: Record<string, string>;
  watermark?: string;
}) {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(240, 240, 255);
  doc.text("KIKI Agent", margin, 18);
  doc.setFontSize(9);
  doc.setTextColor(136, 136, 170);
  doc.text("KIKI Agent \u00b7 a STOREGRILL INC LTD product \u00b7 kiki.ai", margin, 26);

  y = 44;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(240, 240, 255);
  doc.text(opts.title, margin, y);
  y += 10;

  if (opts.metadata) {
    const metaStr = Object.entries(opts.metadata)
      .map(([k, v]) => `${k}: ${v}`)
      .join("  \u00b7  ");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(136, 136, 170);
    doc.text(metaStr, margin, y);
    y += 10;
  }

  doc.setDrawColor(42, 42, 74);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const renderParagraph = (paragraph: string) => {
    const lines = doc.splitTextToSize(paragraph, contentW);
    const lineHeight = 5.5;
    const blockH = lines.length * lineHeight + 6;
    if (y + blockH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 76);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 6;
  };

  const renderHeading = (heading: string) => {
    const lines = doc.splitTextToSize(heading, contentW);
    const lineHeight = 6;
    const blockH = lines.length * lineHeight + 6;
    if (y + blockH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(0, 92, 255);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 4;
  };

  if (opts.sections && opts.sections.length > 0) {
    for (const sec of opts.sections) {
      renderHeading(sec.heading);
      for (const para of sec.body) renderParagraph(para);
    }
  } else if (opts.content) {
    for (const paragraph of opts.content) renderParagraph(paragraph);
  }

  if (opts.watermark) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(230, 230, 240, 0.06);
    const textW = doc.getTextWidth(opts.watermark);
    doc.text(opts.watermark, (pageW - textW) / 2, pageH / 2, { angle: 45 });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 170);
    doc.text(
      `Page ${i} of ${totalPages}  \u00b7  Confidential \u00b7 KIKI Agent (STOREGRILL INC LTD)`,
      margin,
      pageH - 10
    );
    doc.text(
      "Generated: " + new Date().toISOString().split("T")[0],
      pageW - margin,
      pageH - 10,
      { align: "right" }
    );
  }

  doc.save(opts.filename);
}

export async function downloadSimplePDF(filename: string, title: string, body: string) {
  await generatePDF({
    filename,
    title,
    content: body.split("\n\n").filter(Boolean),
    watermark: "KIKI",
  });
}
