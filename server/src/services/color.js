const GOLDEN_ANGLE = 137.508;

export function colorForIndex(index) {
  const hue = Math.round((index * GOLDEN_ANGLE) % 360);
  return `hsl(${hue}, 42%, 48%)`;
}
