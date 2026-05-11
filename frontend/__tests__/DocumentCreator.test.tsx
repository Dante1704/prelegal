import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentCreator from "@/components/DocumentCreator";
import type { Template } from "@/lib/templates";

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

const NDA_TEMPLATE: Template = {
  id: "nda",
  name: "Non-Disclosure Agreement",
  category: "confidentiality",
  description: "An NDA.",
  fields: [
    { name: "disclosing_party_name", label: "Disclosing Party Name", type: "text", required: true },
    { name: "disclosing_party_address", label: "Disclosing Party Address", type: "text", required: true },
    { name: "receiving_party_name", label: "Receiving Party Name", type: "text", required: true },
    { name: "receiving_party_address", label: "Receiving Party Address", type: "text", required: true },
    { name: "effective_date", label: "Effective Date", type: "date", required: true },
    { name: "purpose", label: "Purpose of Disclosure", type: "textarea", required: true },
    { name: "confidentiality_period_years", label: "Confidentiality Period (Years)", type: "number", required: true },
    { name: "governing_law_state", label: "Governing Law (State/Country)", type: "text", required: true },
  ],
  content:
    "NDA between {{disclosing_party_name}} ({{disclosing_party_address}}) and " +
    "{{receiving_party_name}} ({{receiving_party_address}}) effective {{effective_date}} " +
    "for {{purpose}} for {{confidentiality_period_years}} years under {{governing_law_state}} law.",
};

const ALL_FIELD_VALUES: Record<string, string> = {
  disclosing_party_name: "Acme Corp",
  disclosing_party_address: "1 Tech Lane",
  receiving_party_name: "Widget Ltd",
  receiving_party_address: "2 Market St",
  effective_date: "2025-06-01",
  purpose: "Exploring a deal",
  confidentiality_period_years: "2",
  governing_law_state: "England and Wales",
};

jest.mock("@/lib/templates", () => ({
  __esModule: true,
  getTemplate: jest.fn(),
}));
const { getTemplate } = jest.requireMock("@/lib/templates") as {
  getTemplate: jest.Mock;
};

// Mock DocumentChat — capture the callbacks so tests can drive the parent
let capturedOnExtract: ((extracted: Record<string, string>) => void) | null = null;
let capturedOnSelect: ((id: string) => void) | null = null;
let capturedTemplateId: string | null = null;
jest.mock("@/components/DocumentChat", () => ({
  __esModule: true,
  default: (props: {
    templateId: string | null;
    onExtract: (e: Record<string, string>) => void;
    onSelectTemplate: (id: string) => void;
  }) => {
    capturedOnExtract = props.onExtract;
    capturedOnSelect = props.onSelectTemplate;
    capturedTemplateId = props.templateId;
    return <div data-testid="mock-chat">chat (template={props.templateId ?? "none"})</div>;
  },
}));

async function selectNdaTemplate() {
  (getTemplate as jest.Mock).mockResolvedValueOnce(NDA_TEMPLATE);
  await act(async () => {
    capturedOnSelect!("nda");
  });
  await waitFor(() => expect(screen.getByText(NDA_TEMPLATE.name)).toBeInTheDocument());
}

async function fillAllFields() {
  await act(async () => {
    capturedOnExtract!(ALL_FIELD_VALUES);
  });
}

function preview() {
  return within(screen.getByTestId("document-preview"));
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnExtract = null;
  capturedOnSelect = null;
  capturedTemplateId = null;
});

describe("DocumentCreator", () => {
  it("shows a placeholder before any template is selected", () => {
    render(<DocumentCreator />);
    expect(screen.getByTestId("mock-chat")).toBeInTheDocument();
    expect(screen.getByText(/which document you want/i)).toBeInTheDocument();
    expect(screen.queryByTestId("document-preview")).not.toBeInTheDocument();
    expect(capturedTemplateId).toBeNull();
  });

  it("Download PDF is disabled before a template is selected", () => {
    render(<DocumentCreator />);
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
  });

  it("loads the template when the chat selects one", async () => {
    render(<DocumentCreator />);
    await selectNdaTemplate();
    expect(getTemplate).toHaveBeenCalledWith("nda");
    expect(screen.getByTestId("document-preview")).toBeInTheDocument();
  });

  it("shows placeholders for every required field after template loads", async () => {
    render(<DocumentCreator />);
    await selectNdaTemplate();
    NDA_TEMPLATE.fields
      .filter((f) => f.required)
      .forEach((field) => {
        expect(
          preview().getByText(new RegExp(`\\[${escapeRegex(field.label)}\\]`, "i"))
        ).toBeInTheDocument();
      });
  });

  it("replaces placeholders with extracted values", async () => {
    render(<DocumentCreator />);
    await selectNdaTemplate();
    await fillAllFields();
    expect(preview().queryByText(/\[Disclosing Party Name\]/i)).not.toBeInTheDocument();
    expect(preview().getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it("ignores extracted keys that are not template fields", async () => {
    render(<DocumentCreator />);
    await selectNdaTemplate();
    await act(async () => {
      capturedOnExtract!({ unrelated_key: "x", disclosing_party_name: "Acme" });
    });
    expect(preview().getByText(/Acme/)).toBeInTheDocument();
  });

  it("Download PDF is disabled until all required fields are filled", async () => {
    render(<DocumentCreator />);
    await selectNdaTemplate();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    await act(async () => {
      capturedOnExtract!({ disclosing_party_name: "Acme" });
    });
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
    await fillAllFields();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled();
  });

  it("saves the PDF with a filename derived from template id", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator />);
    await selectNdaTemplate();
    await fillAllFields();
    await user.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(mockSave).toHaveBeenCalledWith("nda.pdf");
  });

  it("passes filled field values to splitTextToSize", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator />);
    await selectNdaTemplate();
    await fillAllFields();
    await user.click(screen.getByRole("button", { name: /download pdf/i }));
    const allArgs = mockSplitTextToSize.mock.calls.flat().join(" ");
    expect(allArgs).toContain("Acme Corp");
    expect(allArgs).toContain("Widget Ltd");
  });

  it("surfaces a load error if the template fetch fails", async () => {
    (getTemplate as jest.Mock).mockRejectedValueOnce(new Error("nope"));
    render(<DocumentCreator />);
    await act(async () => {
      capturedOnSelect!("nda");
    });
    await waitFor(() => expect(screen.getByText(/nope/)).toBeInTheDocument());
  });
});
