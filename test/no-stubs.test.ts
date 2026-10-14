import { describe, it, expect } from "vitest";
// Plain ESM audit script (scripts/ is excluded from tsconfig) — see
// scripts/audit-fakes.mjs. This test is the CI gate that keeps stubs, mock
// data, dead links, no-op handlers and API route/method mismatches from
// creeping back into src/. Findings must be remediated or explicitly
// allowlisted in .fake-allowlist.json with a reason.
import { runAudit } from "../scripts/audit-fakes.mjs";

interface Finding {
  id: string;
  file: string;
  line: number;
  text: string;
}

describe("no stubs / mock data / dead links", () => {
  const result = runAudit();

  it("has no un-allowlisted findings", () => {
    const lines = (result.unallowed as Finding[]).map(
      (f) => `  ${f.id}  ${f.file}:${f.line}  ${f.text}`
    );
    const message = `Un-allowlisted findings:\n${lines.join("\n")}`;
    expect(lines, message).toEqual([]);
  });

  it("has no dead internal links", () => {
    const dead = (result.unallowed as Finding[]).filter((f) => f.id === "dead-link");
    expect(dead).toEqual([]);
  });
});
