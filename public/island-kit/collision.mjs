import { Box3, Matrix3, Matrix4, Raycaster, Triangle, Vector3 } from './three.module.min.js';

const footSamples = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function createIslandCollision(model) {
  const walkables = new Set(model.walkables);
  const solids = [];
  model.group.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || walkables.has(mesh)) return;
    if (mesh.userData.isWater || mesh.userData.walkableTrim || mesh.userData.nonBlockingDecoration) return;
    for (let parent = mesh.parent; parent; parent = parent.parent) {
      if (parent.userData.nonBlockingVegetation) return;
    }
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    solids.push({ mesh, transform: new Matrix4(), bounds: new Box3() });
  });

  const body = new Box3();
  const triangle = new Triangle();
  const origin = model.group.position;
  const ray = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const normalMatrix = new Matrix3();
  const normal = new Vector3();
  const hits = [];

  function boundsFor({ mesh, transform, bounds }) {
    if (bounds.isEmpty() || !transform.equals(mesh.matrixWorld)) {
      transform.copy(mesh.matrixWorld);
      bounds.copy(mesh.geometry.boundingBox).applyMatrix4(transform);
    }
    return bounds;
  }

  function blocksMovement(x, z, nextX, nextZ, feet, radius, height, skin = .05) {
    // Each movement is axis-aligned. The box covers the leading edge of the
    // player's body from its old position to its new position.
    body.min.set(origin.x + Math.min(x, nextX) + (nextX > x ? radius : -radius),
      origin.y + feet + skin, origin.z + Math.min(z, nextZ) + (nextZ > z ? radius : -radius));
    body.max.set(origin.x + Math.max(x, nextX) + (nextX < x ? -radius : radius),
      origin.y + feet + height, origin.z + Math.max(z, nextZ) + (nextZ < z ? -radius : radius));
    for (const solid of solids) {
      if (!body.intersectsBox(boundsFor(solid))) continue;
      const { mesh: { geometry }, transform } = solid;
      const { index, attributes: { position } } = geometry;
      for (let i = 0, count = index?.count ?? position.count; i + 2 < count; i += 3) {
        triangle.a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(transform);
        triangle.b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(transform);
        triangle.c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(transform);
        if (body.intersectsTriangle(triangle)) return true;
      }
    }
    return false;
  }

  function floorAt(x, z, ceiling, minimum, radius) {
    const wx = origin.x + x, wz = origin.z + z, top = origin.y + ceiling;
    let floor = -Infinity;
    ray.far = ceiling - minimum;
    for (const solid of solids) {
      const { min, max } = boundsFor(solid);
      if (wx + radius < min.x || wx - radius > max.x ||
          wz + radius < min.z || wz - radius > max.z ||
          top < min.y || origin.y + Math.max(floor, minimum) > max.y) continue;
      normalMatrix.getNormalMatrix(solid.transform);
      for (const [dx, dz] of footSamples) {
        const px = wx + dx * radius, pz = wz + dz * radius;
        if (px < min.x || px > max.x || pz < min.z || pz > max.z) continue;
        ray.ray.origin.set(px, top, pz);
        ray.ray.direction.copy(down);
        hits.length = 0;
        ray.intersectObject(solid.mesh, false, hits);
        for (const hit of hits) {
          if (normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix).y < .64) continue;
          floor = Math.max(floor, hit.point.y - origin.y);
        }
      }
    }
    return floor;
  }

  return { blocksMovement, floorAt };
}
