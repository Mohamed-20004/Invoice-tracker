// Shared between server pages (prefill construction) and the client builder.

export interface BuilderRow {
  key: string;
  description: string;
  quantity: string; // raw user input
  unitPrice: string; // raw pounds input
  included: boolean;
}

let keyCounter = 0;

export function newRowKey(): string {
  keyCounter += 1;
  return `row-${keyCounter}-${Date.now()}`;
}

export function emptyRow(): BuilderRow {
  return {
    key: newRowKey(),
    description: "",
    quantity: "1",
    unitPrice: "",
    included: true,
  };
}
