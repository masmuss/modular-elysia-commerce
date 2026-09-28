import type { productsTable } from "./schema";

export type Product = typeof productsTable.$inferSelect;
export type CreateProduct = typeof productsTable.$inferInsert;
export type UpdateProduct = Partial<CreateProduct>;
