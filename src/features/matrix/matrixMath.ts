export interface MatrixPosition {
  importance: number
  urgency: number
}

/**
 * Map a pointer point inside the matrix surface to matrix values (pure, so
 * the drag geometry is unit-testable): x → urgency (left 0 … right 100),
 * y → importance (top 100 … bottom 0).
 */
export function pointToPosition(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): MatrixPosition {
  if (rect.width <= 0 || rect.height <= 0) return { importance: 50, urgency: 50 }
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))
  return {
    urgency: clamp((100 * (clientX - rect.left)) / rect.width),
    importance: clamp(100 * (1 - (clientY - rect.top) / rect.height)),
  }
}
