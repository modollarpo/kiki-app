import { describe, it, expect } from "vitest";
import { CONTRACTS, getContract, DOC_SLUGS } from "@/lib/contracts";

describe("contracts library", () => {
  it("has no empty documents", () => {
    const keys = Object.keys(CONTRACTS);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    for (const k of keys) {
      const doc = CONTRACTS[k];
      expect(doc.title, `title for ${k}`).toBeTruthy();
      expect(doc.content.length, `content length for ${k}`).toBeGreaterThan(3);
      for (const para of doc.content) {
        expect(para, `paragraph in ${k}`).not.toContain("undefined");
        expect(para.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("every Compliance Hub doc resolves to a real contract", () => {
    for (const [docName, slug] of Object.entries(DOC_SLUGS)) {
      const resolved = getContract(slug);
      expect(resolved, `slug ${slug} for ${docName}`).toBeDefined();
      expect(resolved!.content.length).toBeGreaterThan(3);
    }
  });

  it("NDA is retrievable and substantive", () => {
    const nda = getContract("mutual-nda");
    expect(nda).toBeDefined();
    expect(nda!.content.join(" ").toLowerCase()).toContain("confidential");
  });
});
