// tests/integration/AddInventoryPage.test.tsx

import { render, screen, fireEvent } from "@testing-library/react";
// Import act from React (not from react-dom/test-utils)
import { act } from "react";
import fetchMock from "jest-fetch-mock";

// This is your Next.js 13 page
import AddInventoryItem from "@/app/inventory/add/page";

// Mock fetch globally in this test file
fetchMock.enableMocks();

describe("AddInventoryItem Page", () => {
  beforeEach(() => {
    // Reset the mock so each test starts fresh
    fetchMock.resetMocks();
  });

  it("shows error if SKU is empty", async () => {
    // Provide a valid response for /api/inventory so it doesn't break
    fetchMock.mockResponseOnce(JSON.stringify([]));

    render(<AddInventoryItem />);

    // The submit button text is "submit" in your DOM snapshot
    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeInTheDocument();

    // Wrap the click in an act(...) to handle React state updates
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Because the next-intl mock maps "errorSKURequired" to "SKU is required"
    // we expect to see "SKU is required" in the DOM
    const errorMessage = await screen.findByText(/sku is required/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
