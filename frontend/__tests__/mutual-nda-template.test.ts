import mutualNdaTemplate from "@/lib/mutual-nda-template";

describe("mutualNdaTemplate", () => {
  it("has the expected id and name", () => {
    expect(mutualNdaTemplate.id).toBe("mutual_nda");
    expect(mutualNdaTemplate.name).toBe("Mutual Non-Disclosure Agreement");
  });

  it("has exactly 8 fields", () => {
    expect(mutualNdaTemplate.fields).toHaveLength(8);
  });

  it("marks all required fields as required", () => {
    const required = mutualNdaTemplate.fields.filter((f) => f.required).map((f) => f.name);
    expect(required).toEqual(
      expect.arrayContaining([
        "party_a_name",
        "party_a_address",
        "party_b_name",
        "party_b_address",
        "effective_date",
        "purpose",
        "confidentiality_period_years",
        "governing_law_state",
      ])
    );
  });

  it("uses valid field types only", () => {
    const validTypes = ["text", "date", "number", "textarea"];
    mutualNdaTemplate.fields.forEach((f) => {
      expect(validTypes).toContain(f.type);
    });
  });

  it("every placeholder in content has a matching field", () => {
    const placeholders = [...mutualNdaTemplate.content.matchAll(/\{\{(\w+)\}\}/g)].map(
      (m) => m[1]
    );
    const fieldNames = mutualNdaTemplate.fields.map((f) => f.name);
    const uniquePlaceholders = [...new Set(placeholders)];
    uniquePlaceholders.forEach((p) => {
      expect(fieldNames).toContain(p);
    });
  });

  it("content contains both party signatures", () => {
    expect(mutualNdaTemplate.content).toContain("Party A");
    expect(mutualNdaTemplate.content).toContain("Party B");
  });

  it("content contains all expected section headings", () => {
    const expectedSections = [
      "PURPOSE",
      "DEFINITION OF CONFIDENTIAL INFORMATION",
      "MUTUAL OBLIGATIONS",
      "EXCLUSIONS",
      "TERM",
      "RETURN OF INFORMATION",
      "NO LICENCE",
      "GOVERNING LAW",
      "ENTIRE AGREEMENT",
    ];
    expectedSections.forEach((section) => {
      expect(mutualNdaTemplate.content).toContain(section);
    });
  });
});
