export function unusualQuantityWarning(quantity: number, unit: string): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  const normalized = unit.trim().toLowerCase();
  const countable = /(slice|piece|item|egg|idli|cup|glass|bowl|serving|scoop)/.test(normalized);
  if (countable && quantity > 12) {
    return `That's a lot of ${normalized || 'servings'} (${quantity}). You can still log it — double-check the quantity.`;
  }
  if (/(g|gram|ml|millilitre|milliliter)/.test(normalized) && quantity > 1500) {
    return `${quantity} ${normalized} is unusually high for one entry. You can still log it.`;
  }
  if (!countable && quantity > 50 && !/(g|gram|ml|millilitre|milliliter)/.test(normalized)) {
    return `Quantity ${quantity} looks high. You can still log it if that's correct.`;
  }
  return null;
}
