import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders upload page", () => {
  render(<App />);
  const title = screen.getByRole("heading", { name: "Upload" });
  expect(title).toBeInTheDocument();
});
