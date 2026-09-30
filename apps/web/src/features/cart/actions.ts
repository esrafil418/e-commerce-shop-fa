"use server";

import { addToCart, updateCartItem } from "./server";

export async function addToCartAction(variantId: string, quantity: number) {
  return addToCart({ variantId, quantity });
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  return updateCartItem(itemId, quantity);
}
