import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentChat from "@/components/DocumentChat";

function mockFetchOnce(payload: object) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  });
}

function chatPayload(overrides: Partial<{
  message: string;
  selected_template_id: string | null;
  suggested_template_id: string | null;
  extracted_fields: Record<string, string>;
  complete: boolean;
}> = {}) {
  return {
    message: "Hi!",
    selected_template_id: null,
    suggested_template_id: null,
    extracted_fields: {},
    complete: false,
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("DocumentChat", () => {
  it("renders the assistant's greeting on mount", async () => {
    mockFetchOnce(chatPayload({ message: "Hi! Which document do you want?" }));

    await act(async () => {
      render(
        <DocumentChat
          templateId={null}
          values={{}}
          onExtract={jest.fn()}
          onSelectTemplate={jest.fn()}
        />
      );
    });

    await waitFor(() =>
      expect(screen.getByText("Hi! Which document do you want?")).toBeInTheDocument()
    );
  });

  it("invokes onSelectTemplate when the assistant picks a template", async () => {
    mockFetchOnce(chatPayload({ message: "Hi!" }));
    mockFetchOnce(
      chatPayload({
        message: "Great — let's draft an NDA.",
        selected_template_id: "nda",
      })
    );

    const onSelect = jest.fn();
    await act(async () => {
      render(
        <DocumentChat
          templateId={null}
          values={{}}
          onExtract={jest.fn()}
          onSelectTemplate={onSelect}
        />
      );
    });
    await waitFor(() => expect(screen.getByText("Hi!")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/type your reply/i), "an NDA");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("nda"));
  });

  it("extracts fields in filling stage and renders the reply", async () => {
    mockFetchOnce(chatPayload({ message: "Hello!" }));
    mockFetchOnce(
      chatPayload({
        message: "Got it. What's the address?",
        extracted_fields: { disclosing_party_name: "Acme" },
      })
    );

    const onExtract = jest.fn();
    await act(async () => {
      render(
        <DocumentChat
          templateId="nda"
          values={{}}
          onExtract={onExtract}
          onSelectTemplate={jest.fn()}
        />
      );
    });
    await waitFor(() => expect(screen.getByText("Hello!")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/type your reply/i), "Acme");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByText("Got it. What's the address?")).toBeInTheDocument()
    );
    expect(onExtract).toHaveBeenCalledWith({ disclosing_party_name: "Acme" });
  });

  it("shows an error message if the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "boom" }),
    });

    await act(async () => {
      render(
        <DocumentChat
          templateId={null}
          values={{}}
          onExtract={jest.fn()}
          onSelectTemplate={jest.fn()}
        />
      );
    });

    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });
});
