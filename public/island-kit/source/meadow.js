// Extend the rim while keeping the existing terrain samples under every feature.
const expansion = 0.22;
export const meadowRows = 9;

export function meadowOutline(original, clearance = () => 1) {
  return (angle, scale = 1) => {
    const [x, z] = original(angle, scale);
    // Keep the full widening through the upper rock shoulder, then taper it out below.
    const depthBlend = Math.min(1, Math.max(0, (scale - 0.46) / 0.36));
    const growth = 1 + expansion * depthBlend * clearance(angle);
    return [x * growth, z * growth];
  };
}

export function meadowSample(angle, row, original, expanded) {
  const blend = row / meadowRows;
  const [x, z] = original(angle);
  const [outerX, outerZ] = expanded(angle);
  return [x + (outerX - x) * blend, z + (outerZ - z) * blend];
}

export function containsPoint(outline, x, z, margin) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [ax, az] = outline[j], [bx, bz] = outline[i];
    if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
    if (margin > 0) {
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      if ((x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2 < margin ** 2) return false;
    }
  }
  return inside;
}
