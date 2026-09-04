/**
 * KIKI Agent — HTML Document Generator
 * Converts markdown business documents to branded HTML with print-to-PDF optimisation.
 *
 * Usage:
 *   cd docs
 *   node generate-html.js
 *   # Then open docs/output/index.html and Print → Save as PDF
 *   # Or use headless Edge (auto-triggered if available)
 */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { execSync } = require("child_process");

const DOCS_DIR = __dirname;
const OUTPUT_DIR = path.join(DOCS_DIR, "output");
const TEMPLATE_PATH = path.join(DOCS_DIR, "templates", "pdf-template.html");

const DOCUMENTS = [
  { file: "01-executive-summary.md",     title: "Executive Summary",            status: "Investor & Partner Document" },
  { file: "02-co-founder-term-sheet.md",  title: "Co-Founder Term Sheet",        status: "Proposal — Not Legally Binding" },
  { file: "03-founders-agreement.md",     title: "Founders' Agreement",          status: "Draft — Seek Legal Advice" },
  { file: "04-business-plan.md",          title: "Full Business Plan",           status: "Strategic Planning Document" },
  { file: "05-pitch-deck.md",             title: "Pitch Deck Narrative",         status: "Investor Presentation Script" },
  { file: "06-financial-model.md",        title: "Financial Model & Projections", status: "5-Year Financial Forecast" },
  { file: "07-co-founder-role-scope.md",  title: "Co-Founder Role Scope",        status: "UK Operations & Revenue Role" },
  { file: "08-sla-framework.md",          title: "Service Level Agreement",      status: "Enterprise Customer SLA" },
  { file: "09-brand-guidelines.md",       title: "Brand Guidelines",             status: "Visual Identity Standards" },
  { file: "10-gdpr-compliance.md",        title: "GDPR Compliance Framework",   status: "Data Protection Structure" },
  { file: "11-customer-one-pager.md",     title: "Customer One-Pager",           status: "B2B Outreach Collateral" },
];

function parseCoverInfo(md, filename) {
  const doc = DOCUMENTS.find(d => d.file === filename);
  let title = doc ? doc.title : "";
  let status = doc ? doc.status : "Confidential";

  const titleMatch = md.match(/^# (.+)$/m);
  if (titleMatch && titleMatch[1].trim()) {
    title = titleMatch[1].trim().replace(/\*+/g, "").trim();
  }

  return { title, status };
}

function stripFrontmatter(md) {
  return md.replace(/^---[\s\S]*?---\n*/m, "").trim();
}

async function generateHtml() {
  console.log("KIKI Agent — HTML Document Generator\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  let success = 0;
  let failed = 0;

  // Build index page entries
  const indexEntries = [];

  for (const doc of DOCUMENTS) {
    const mdPath = path.join(DOCS_DIR, doc.file);

    if (!fs.existsSync(mdPath)) {
      console.warn(`  ⚠  Skipping — file not found: ${doc.file}`);
      failed++;
      continue;
    }

    try {
      const rawMd = fs.readFileSync(mdPath, "utf-8");
      const { title, status } = parseCoverInfo(rawMd, doc.file);
      const bodyMd = stripFrontmatter(rawMd);

      const bodyHtml = await marked.parse(bodyMd, { breaks: true });

      const htmlFilename = doc.file.replace(".md", ".html");
      const html = template
        .replace("{{TITLE}}", title)
        .replace("{{DATE}}", today)
        .replace("{{STATUS}}", status)
        .replace("{{CONTENT}}", bodyHtml);

      const htmlPath = path.join(OUTPUT_DIR, htmlFilename);
      fs.writeFileSync(htmlPath, html, "utf-8");

      console.log(`  ✅ Generated: ${htmlFilename}`);
      indexEntries.push({ filename: htmlFilename, title, file: doc.file });
      success++;
    } catch (err) {
      console.error(`  ❌ Failed: ${doc.file} — ${err.message}`);
      failed++;
    }
  }

  // Generate index page
  const indexHtml = buildIndexPage(indexEntries, today);
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), indexHtml, "utf-8");
  console.log(`  ✅ Generated: index.html`);

  // Check if Edge headless is available for PDF generation
  let edgeAvailable = false;
  try {
    execSync('where msedge', { stdio: 'pipe' });
    edgeAvailable = true;
  } catch (e) {
    try {
      execSync('where "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"', { stdio: 'pipe' });
      edgeAvailable = true;
    } catch (e2) {
      console.log("\n  ℹ  Edge headless not detected. Install Edge or print manually.");
    }
  }

  if (edgeAvailable) {
    console.log("\n  ℹ  Edge detected. Generating PDFs via headless Edge...");
    for (const entry of indexEntries) {
      const htmlPath = path.join(OUTPUT_DIR, entry.filename);
      const pdfPath = path.join(OUTPUT_DIR, entry.filename.replace(".html", ".pdf"));
      try {
        execSync(
          `msedge --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`,
          { stdio: 'pipe', timeout: 30000 }
        );
        console.log(`  ✅ PDF: ${entry.filename.replace(".html", ".pdf")}`);
      } catch (err) {
        console.warn(`  ⚠  PDF failed for ${entry.filename}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. ${success} HTML documents generated.`);
  console.log(`\nOpen in browser: file:///${OUTPUT_DIR.replace(/\\/g, "/")}/index.html`);
  console.log("Then Print (Ctrl+P) → Save as PDF for each document.");
}

function buildIndexPage(entries, date) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>KIKI Agent — Business Document Suite</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: #030712;
    color: #F9FAFB;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
  }
  .container { max-width: 900px; width: 100%; }
  .header {
    text-align: center;
    margin-bottom: 48px;
  }
  .brand {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 700;
    color: #005CFF;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .tagline {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #6B7280;
    letter-spacing: 0.04em;
    margin-bottom: 16px;
  }
  .divider {
    width: 80px;
    height: 2px;
    background: #005CFF;
    margin: 16px auto;
  }
  h1 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    color: #F9FAFB;
    margin-bottom: 4px;
  }
  .subtitle {
    font-size: 12px;
    color: #6B7280;
  }
  .doc-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .doc-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #111827;
    border: 1px solid #1F2937;
    border-radius: 4px;
    text-decoration: none;
    color: #F9FAFB;
    transition: background 0.2s;
  }
  .doc-item:hover {
    background: #1F2937;
    border-color: #005CFF;
  }
  .doc-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #005CFF;
    width: 28px;
  }
  .doc-title {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    margin: 0 12px;
  }
  .doc-links {
    display: flex;
    gap: 6px;
  }
  .doc-links a {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    padding: 3px 8px;
    border-radius: 2px;
    text-decoration: none;
    color: #9CA3AF;
    border: 1px solid #374151;
    transition: all 0.2s;
  }
  .doc-links a:hover {
    color: #005CFF;
    border-color: #005CFF;
    background: rgba(0, 92, 255, 0.1);
  }
  .footer {
    margin-top: 48px;
    text-align: center;
    font-size: 10px;
    color: #4B5563;
    line-height: 1.6;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    font-weight: 500;
    color: #F9FAFB;
    background: #005CFF;
    margin-left: 4px;
    letter-spacing: 0.05em;
  }
  .instructions {
    background: #111827;
    border: 1px solid #1F2937;
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 32px;
    font-size: 11px;
    color: #9CA3AF;
    line-height: 1.7;
  }
  .instructions code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    background: #1F2937;
    padding: 1px 5px;
    border-radius: 2px;
    color: #31F3C3;
  }
  hr {
    border: none;
    border-top: 1px solid #1F2937;
    margin: 16px 0;
  }
</style>
</head><body>
<div class="container">
  <div class="header">
    <div class="brand">KIKI Agent™</div>
    <div class="tagline">A STOREGRILL INC LTD Company</div>
    <div class="divider"></div>
    <h1>Business Document Suite</h1>
    <p class="subtitle">${date} &middot; ${entries.length} documents &middot; Confidential</p>
  </div>

  <div class="instructions">
    <strong>Print to PDF:</strong> Open each document below, then press <strong>Ctrl+P</strong> (or Cmd+P) and select <strong>Save as PDF</strong>.<br>
    The documents are pre-formatted with A4 page size, KIKI Agent branding, headers, and footers.<br>
    For best results, use <strong>Chrome</strong> or <strong>Edge</strong> and enable <strong>"Background graphics"</strong> in print settings.
  </div>

  <div class="doc-list">
    ${entries.map((e, i) => {
      const num = String(i + 1).padStart(2, "0");
      return `<a class="doc-item" href="${e.filename}" target="_blank">
        <span class="doc-num">${num}</span>
        <span class="doc-title">${e.title}</span>
        <span class="doc-links">
          <a href="${e.filename}" target="_blank" onclick="event.stopPropagation()">HTML</a>
          ${fs.existsSync(path.join(OUTPUT_DIR, e.filename.replace(".html", ".pdf")))
            ? `<a href="${e.filename.replace(".html", ".pdf")}" target="_blank" onclick="event.stopPropagation()">PDF</a>`
            : ""}
        </span>
      </a>`;
    }).join("\n    ")}
  </div>

  <div class="footer">
    KIKI Agent™ — A STOREGRILL INC LTD Company<br>
    Registered in England & Wales<br>
    All documents confidential — not for distribution without authorisation
  </div>
</div>
</body></html>`;
}

generateHtml().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
