import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaCreator from "@/components/NdaCreator";
import mutualNdaTemplate from "@/lib/mutual-nda-template";

const mockSave = jest.fn();
const mockText = jest.fn();
const mockAddPage = jest.fn();
const mockSplitTextToSize = jest.fn((text: string) => [text]);

jest.mock("jspdf", () => ({
  __esModule: true,
  jsPDF: jest.fn().mockImplementation(() => ({
    internal: {
      pageSize: { width: 210, height: 297 },
    },
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    splitTextToSize: mockSplitTextToSize,
    text: mockText,
    addPage: mockAddPage,
    save: mockSave,
  })),
}));

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALL_FIELD_VALUES: Record<string, string> = {
  party_a_name: "Acme Corp",
  party_a_address: "1 Tech Lane, London",
  party_b_name: "Widget Ltd",
  party_b_address: "2 Market St, Manchester",
  effective_date: "2025-06-01",
  purpose: "Exploring a potential acquisition",
  confidentiality_period_years: "2",
  governing_law_state: "England and Wales",
};

function fillAllFields() {
  for (const [name, value] of Object.entries(ALL_FIELD_VALUES)) {
    fireEvent.change(document.getElementById(name)!, { target: { value } });
  }
}

describe("NdaCreator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders all form field labels associated with their inputs", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      mutualNdaTemplate.fields.forEach((field) => {
        // getByLabelText verifies both the label text and its htmlFor→id association
        expect(screen.getByLabelText(new RegExp(escapeRegex(field.label), "i"))).toBeInTheDocument();
      });
    });

    it("renders the document preview panel heading", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByText("Document preview")).toBeInTheDocument();
    });

    it("renders the Download PDF button", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    });

    it("renders inputs/textareas with ids matching each field name", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      mutualNdaTemplate.fields.forEach((field) => {
        expect(document.getElementById(field.name)).not.toBeNull();
      });
    });

    it("associates every label with its input via htmlFor", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      mutualNdaTemplate.fields.forEach((field) => {
        expect(document.querySelector(`label[for="${field.name}"]`)).not.toBeNull();
      });
    });

    it("renders a textarea for the purpose field", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(document.getElementById("purpose")?.tagName).toBe("TEXTAREA");
    });

    it("renders input[type=number] for the confidentiality period", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      const el = document.getElementById("confidentiality_period_years") as HTMLInputElement;
      expect(el.type).toBe("number");
    });

    it("sets min=1 and step=1 on number inputs to block negative/fractional values", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      const el = document.getElementById("confidentiality_period_years") as HTMLInputElement;
      expect(el.min).toBe("1");
      expect(el.step).toBe("1");
    });
  });

  // ─── Live preview ─────────────────────────────────────────────────────────

  describe("live preview", () => {
    function preview() {
      return within(screen.getByTestId("nda-preview"));
    }

    it("shows placeholder text for every unfilled required field", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      mutualNdaTemplate.fields
        .filter((f) => f.required)
        .forEach((field) => {
          expect(
            preview().getByText(new RegExp(`\\[${escapeRegex(field.label)}\\]`, "i"))
          ).toBeInTheDocument();
        });
    });

    it("replaces a placeholder with the typed value in real time", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.type(screen.getByLabelText(/party a name/i), "Acme Corp");
      expect(preview().queryByText(/\[Party A Name\]/i)).not.toBeInTheDocument();
      expect(preview().getByText(/Acme Corp/)).toBeInTheDocument();
    });

    it("restores the placeholder when a field is cleared", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      const input = screen.getByLabelText(/party a name/i);
      await user.type(input, "Acme Corp");
      await user.clear(input);
      expect(preview().getByText(/\[Party A Name\]/i)).toBeInTheDocument();
    });

    it("leaves other placeholders intact when only one field is filled", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.type(screen.getByLabelText(/party a name/i), "Acme Corp");
      expect(preview().getByText(/\[Party B Name\]/i)).toBeInTheDocument();
    });

    it("handles special characters in input without breaking the preview", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.type(screen.getByLabelText(/party a name/i), "O'Brien & Associates");
      expect(preview().getByText(/O'Brien & Associates/)).toBeInTheDocument();
    });

    it("updates preview when effective date is changed", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      fireEvent.change(document.getElementById("effective_date")!, {
        target: { value: "2025-01-15" },
      });
      expect(preview().getByText(/2025-01-15/)).toBeInTheDocument();
    });

    it("updates preview when confidentiality period is changed", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.type(screen.getByLabelText(/confidentiality period/i), "3");
      expect(preview().queryByText(/\[Confidentiality Period/i)).not.toBeInTheDocument();
    });

    it("updates preview when multi-line purpose is entered", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.type(screen.getByLabelText(/purpose/i), "Exploring a potential acquisition");
      expect(preview().getByText(/Exploring a potential acquisition/)).toBeInTheDocument();
    });
  });

  // ─── Download button validation ───────────────────────────────────────────

  describe("Download PDF button — validation", () => {
    it("is disabled when no fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    });

    it("remains disabled when only some required fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      fireEvent.change(document.getElementById("party_a_name")!, {
        target: { value: "Acme Corp" },
      });
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    });

    it("becomes enabled when all required fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled();
    });

    it("does not call jsPDF when clicked while disabled", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  // ─── PDF generation ───────────────────────────────────────────────────────

  describe("PDF generation", () => {
    it("saves with filename mutual-nda.pdf", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      expect(mockSave).toHaveBeenCalledWith("mutual-nda.pdf");
    });

    it("passes filled field values to splitTextToSize", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      const allArgs = mockSplitTextToSize.mock.calls.flat().join(" ");
      expect(allArgs).toContain("Acme Corp");
      expect(allArgs).toContain("Widget Ltd");
    });

    it("does not pass placeholder text to splitTextToSize when all fields are filled", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      const allArgs = mockSplitTextToSize.mock.calls.flat().join(" ");
      expect(allArgs).not.toMatch(/\[Party A Name\]/i);
      expect(allArgs).not.toMatch(/\[Party B Name\]/i);
    });

    it("calls splitTextToSize once per non-empty paragraph — no raw newlines passed", async () => {
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      const paragraphArgs = mockSplitTextToSize.mock.calls.map((c) => c[0]) as string[];
      // Each call should receive a single paragraph (no \n inside it)
      const anyContainsNewline = paragraphArgs.some((a) => a.includes("\n"));
      expect(anyContainsNewline).toBe(false);
    });

    it("adds a new page when content overflows A4 height", async () => {
      // Return enough lines to exceed one A4 page:
      // A4=297mm, margins=20mm×2, lineHeight=5.5mm → ~47 lines per page
      mockSplitTextToSize.mockImplementation(() =>
        Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`)
      );
      const user = userEvent.setup();
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      await user.click(screen.getByRole("button", { name: /download pdf/i }));
      expect(mockAddPage).toHaveBeenCalled();
    });
  });
});
