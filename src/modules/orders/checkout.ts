import type { CheckoutItem } from "./types";

type PricedProduct = {
	id: number;
	price: number;
};

type CheckoutInput = {
	productId: number;
	quantity: number;
};

export const buildCheckoutPayload = (
	items: CheckoutInput[],
	products: PricedProduct[],
): { itemsWithPrice: CheckoutItem[]; totalAmount: number } => {
	const productById = new Map(products.map((p) => [p.id, p]));

	let totalAmount = 0;
	const itemsWithPrice: CheckoutItem[] = [];

	for (const item of items) {
		const product = productById.get(item.productId);
		if (!product) throw new Error(`product ${item.productId} not found`);

		totalAmount += product.price * item.quantity;
		itemsWithPrice.push({
			productId: product.id,
			quantity: item.quantity,
			priceAtTimeOfOrder: product.price,
		});
	}

	return { itemsWithPrice, totalAmount };
};
