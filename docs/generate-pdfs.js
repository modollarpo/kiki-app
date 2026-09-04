/**
 * KIKI Agent — PDF Document Generator
 * Converts markdown business documents to branded PDFs using headless Edge (Chromium).
 *
 * Prerequisites: Microsoft Edge installed (Windows 10+)
 *
 * Usage:
 *   cd docs
 *   npm install marked
 *   node generate-pdfs.js
 *
 * Output: docs/output/*.pdf
 */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { execSync } = require("child_process");

const DOCS_DIR = __dirname;
const OUTPUT_DIR = path.join(DOCS_DIR, "output");
const TEMPLATE_PATH = path.join(DOCS_DIR, "templates", "pdf-template.html");

const DOCUMENTS = [
  { file: "01-executive-summary.md",     title: "Executive Summary" },
  { file: "02-co-founder-term-sheet.md",  title: "Co-Founder Term Sheet" },
  { file: "03-founders-agreement.md",     title: "Founders' Agreement" },
  { file: "04-business-plan.md",          title: "Full Business Plan" },
  { file: "05-pitch-deck.md",             title: "Pitch Deck Narrative" },
  { file: "06-financial-model.md",        title: "Financial Model & Projections" },
  { file: "07-co-founder-role-scope.md",  title: "Co-Founder Role Scope" },
  { file: "08-sla-framework.md",          title: "Service Level Agreement" },
  { file: "09-brand-guidelines.md",       title: "Brand Guidelines" },
  { file: "10-gdpr-compliance.md",        title: "GDPR Compliance Framework" },
  { file: "11-customer-one-pager.md",     title: "Customer One-Pager" },
];

function findEdge() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    return execSync("where msedge", { stdio: "pipe" }).toString().trim().split("\n")[0].trim();
  } catch { return null; }
}

function stripFrontmatter(md) {
  return md.replace(/^---[\s\S]*?---\n*/m, "").trim();
}

async function generatePdfs() {
  console.log("KIKI Agent — PDF Document Generator\n");

  const edgePath = findEdge();
  if (!edgePath) {
    console.error("Microsoft Edge not found. Install Edge or run 'node generate-html.js' and print manually.");
    process.exit(1);
  }
  console.log(`Using Edge: ${edgePath}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(TEMPLATE_PATH)) { console.error(`Template not found: ${TEMPLATE_PATH}`); process.exit(1); }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  let success = 0, failed = 0;

  for (const doc of DOCUMENTS) {
    const mdPath = path.join(DOCS_DIR, doc.file);
    if (!fs.existsSync(mdPath)) { console.warn(`  ⚠  Skipping — ${doc.file}`); failed++; continue; }

    try {
      const rawMd = fs.readFileSync(mdPath, "utf-8");
      const bodyMd = stripFrontmatter(rawMd);
      const bodyHtml = await marked.parse(bodyMd, { breaks: true });

      const html = template
        .replace("{{TITLE}}", doc.title)
        .replace("{{DATE}}", today)
        .replace("{{STATUS}}", "Confidential")
        .replace("{{CONTENT}}", bodyHtml);

      const htmlPath = path.join(OUTPUT_DIR, doc.file.replace(".md", ".html"));
      const pdfPath = path.join(OUTPUT_DIR, doc.file.replace(".md", ".pdf"));

      fs.writeFileSync(htmlPath, html, "utf-8");

      console.log(`  Generating ${doc.file.replace(".md", ".pdf")}...`);
      execSync(`"${edgePath}" --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`,
        { stdio: "pipe", timeout: 30000 });

      const size = fs.statSync(pdfPath).size;
      process.stdout.write(`  ✅ ${doc.file.replace(".md", ".pdf")} (${(size/1024).toFixed(0)} KB)\n`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${doc.file} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${success} PDFs generated. ${failed} failed.`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

generatePdfs().catch(err => { console.error("Fatal:", err); process.exit(1); });
