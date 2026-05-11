import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaChat from "@/components/NdaChat";

function mockFetchOnce(payload: object) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("NdaChat", () => {
  it("renders the assistant's greeting on mount", async () => {
    mockFetchOnce({
      message: "Hi! What's Party A's name?",
      extracted_fields: {},
      complete: false,
    });

    await act(async () => {
      render(<NdaChat values={{}} onExtract={jest.fn()} />);
    });

    await waitFor(() =>
      expect(screen.getByText("Hi! What's Party A's name?")).toBeInTheDocument()
    );
  });

  it("sends a user message and renders the assistant reply", async () => {
    mockFetchOnce({ message: "Hello!", extracted_fields: {}, complete: false });
    mockFetchOnce({
      message: "Got it. What's the address?",
      extracted_fields: { party_a_name: "Acme" },
      complete: false,
    });

    const onExtract = jest.fn();
    await act(async () => {
      render(<NdaChat values={{}} onExtract={onExtract} />);
    });
    await waitFor(() => expect(screen.getByText("Hello!")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/type your reply/i), "Acme");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByText("Got it. What's the address?")).toBeInTheDocument()
    );
    expect(onExtract).toHaveBeenCalledWith({ party_a_name: "Acme" });
    expect(screen.getByText("Acme")).toBeInTheDocument(); // user bubble
  });

  it("shows an error message if the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "boom" }),
    });

    await act(async () => {
      render(<NdaChat values={{}} onExtract={jest.fn()} />);
    });

    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });
});
