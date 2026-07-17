import { describe, it, expect } from "vitest";
import { CONTRACTS, getContract, DOC_SLUGS, ContractDoc } from "@/lib/contracts";

function allText(doc: ContractDoc): string[] {
  let items: string[] = [];
  if (doc.sections && doc.sections.length > 0) {
    items = doc.sections.flatMap((s) => [s.heading, ...s.body]);
  } else {
    items = doc.content ?? [];
  }
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

describe("contracts library", () => {
  it("has no empty documents", () => {
    const keys = Object.keys(CONTRACTS);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    for (const k of keys) {
      const doc = CONTRACTS[k];
      expect(doc.title, `title for ${k}`).toBeTruthy();
      const text = allText(doc);
      expect(text.length, `content length for ${k}`).toBeGreaterThan(3);
      const joined = text.join(" ");
      expect(joined.length, `total content length for ${k}`).toBeGreaterThan(120);
      for (const para of text) {
        expect(para, `paragraph in ${k}`).not.toContain("undefined");
        expect(para.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every Compliance Hub doc resolves to a real contract", () => {
    for (const [docName, slug] of Object.entries(DOC_SLUGS)) {
      const resolved = getContract(slug);
      expect(resolved, `slug ${slug} for ${docName}`).toBeDefined();
      expect(allText(resolved!).length).toBeGreaterThan(3);
    }
  });

  it("NDA is retrievable and substantive", () => {
    const nda = getContract("mutual-nda");
    expect(nda).toBeDefined();
    expect(allText(nda!).join(" ").toLowerCase()).toContain("confidential");
  });
});
