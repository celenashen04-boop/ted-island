// Small, high-contrast silhouettes for the floating 2D seed stage.
const artwork = [
  // Health & Wellbeing · flowering-tree pit.
  [
    ['#694039', 'M-.76 .12 Q-.75-.45-.28-.85 Q-.07-1 .12-.84 Q.69-.49.75.09 Q.79.65.35.86 Q-.16 1.09-.59.66 Q-.81.44-.76.12Z'],
    ['#bf795e', 'M-.66 .13 Q-.64-.43-.22-.75 Q-.04-.88.11-.74 Q.60-.43.65.11 Q.69.58.28.76 Q-.13.96-.50.58 Q-.70.38-.66.13Z'],
    ['#efb09a', 'M-.57 .15 Q-.56-.39-.15-.70 L.09-.59 Q-.17-.38-.26.05 Q-.33.51-.11.72 Q-.59.54-.57.15Z'],
    ['#97544a', 'M.12-.69 Q.28-.17.17.21 Q.11.56-.11.78 Q.46.71.55.32 Q.72-.15.12-.69Z'],
  ],
  // Sustainability · a willow seed with a pale tuft.
  [
    ['#617047', 'M-.52 .24 Q-.82-.16-.80-.73 L-.46-.44 L-.39-.89 L-.12-.58 L.04-1.08 L.24-.66 L.49-.97 L.48-.51 L.77-.69 Q.77-.11.37.27 L.34.66 Q.26 1.01-.095 1.02 Q-.42.92-.40.61Z'],
    ['#fcf3d5', 'M-.41 .27 Q-.67-.10-.68-.54 L-.35-.27 L-.31-.70 L-.08-.40 L.06-.87 L.23-.43 L.38-.74 L.36-.32 L.64-.51 Q.55-.01.25.29Z'],
    ['#c1cf9a', 'M-.26 .28 L-.48-.20 L-.13.16 L.08-.49 L.12.19 L.43-.20 L.27.30Z'],
    ['#7c693e', 'M-.31 .30 Q.01.15.27.34 L.23.64 Q.20.91-.10.91 Q-.31.81-.31.57Z'],
    ['#c4a667', 'M-.23.43 Q-.10.30.08.37 L.01.73 Q-.09.83-.19.73Z'],
  ],
  // Games & Play · a dried maple samara with a papery wing.
  [
    ['#65452f', 'M-.78.76 Q-.99.44-.73.18 Q-.45-.08-.10-.03 Q.28-.63.75-.91 Q.94-.97.94-.70 Q.92.03.15.55 Q-.14 1.01-.49.94 Q-.69.92-.78.76Z'],
    ['#e7cba0', 'M-.12.26 Q.22-.46.81-.80 Q.85-.11.12.43Z'],
    ['#c4a174', 'M-.05.35 Q.33-.12.78-.74 Q.78-.08.12.43Z'],
    ['#94623f', 'M-.69.67 Q-.82.44-.62.26 Q-.35.01-.08.16 Q.14.36-.12.67 Q-.45 1.01-.69.67Z'],
    ['#c18f5f', 'M-.63.56 Q-.68.25-.30.19 Q-.19.22-.25.33 Q-.43.40-.63.56Z'],
  ],
];

const paths = [];

export function paintIslandSeed(context, island) {
  const layers = artwork[island];
  if (!layers) return false;
  paths[island] ??= layers.map(([, contour]) => new Path2D(contour));
  for (const [index, [color]] of layers.entries()) {
    context.fillStyle = color;
    context.fill(paths[island][index]);
  }
  return true;
}
