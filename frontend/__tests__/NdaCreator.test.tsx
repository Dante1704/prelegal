import React from "react";
import { act, render, screen, within } from "@testing-library/react";
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

// Mock NdaChat — capture the onExtract callback so tests can drive `values`
let capturedOnExtract: ((extracted: Record<string, string>) => void) | null = null;
jest.mock("@/components/NdaChat", () => ({
  __esModule: true,
  default: (props: { onExtract: (e: Record<string, string>) => void }) => {
    capturedOnExtract = props.onExtract;
    return <div data-testid="mock-chat">chat</div>;
  },
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
  act(() => {
    capturedOnExtract!(ALL_FIELD_VALUES);
  });
}

function preview() {
  return within(screen.getByTestId("nda-preview"));
}

describe("NdaCreator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnExtract = null;
  });

  describe("rendering", () => {
    it("renders the chat panel and preview heading", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByTestId("mock-chat")).toBeInTheDocument();
      expect(screen.getByText("Document preview")).toBeInTheDocument();
    });

    it("renders the Download PDF button", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    });
  });

  describe("live preview", () => {
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

    it("replaces placeholders with values from onExtract", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      act(() => {
        capturedOnExtract!({ party_a_name: "Acme Corp" });
      });
      expect(preview().queryByText(/\[Party A Name\]/i)).not.toBeInTheDocument();
      expect(preview().getByText(/Acme Corp/)).toBeInTheDocument();
    });

    it("ignores extracted keys that are not template fields", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      act(() => {
        capturedOnExtract!({ unrelated_key: "x", party_a_name: "Acme" });
      });
      expect(preview().getByText(/Acme/)).toBeInTheDocument();
    });

    it("leaves other placeholders intact when only one field is filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      act(() => {
        capturedOnExtract!({ party_a_name: "Acme Corp" });
      });
      expect(preview().getByText(/\[Party B Name\]/i)).toBeInTheDocument();
    });
  });

  describe("Download PDF button — validation", () => {
    it("is disabled when no fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    });

    it("remains disabled when only some required fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      act(() => {
        capturedOnExtract!({ party_a_name: "Acme Corp" });
      });
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    });

    it("becomes enabled when all required fields are filled", () => {
      render(<NdaCreator template={mutualNdaTemplate} />);
      fillAllFields();
      expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled();
    });
  });

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

    it("adds a new page when content overflows A4 height", async () => {
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
