// JMA harp Home button artwork.
// Uses the custom uploaded asset (`assets/ui/jma-harp.png`). Renders the
// image at 100% of its parent so wrappers control the size via Tailwind.

export function HarpIcon({ size }) {
  // Backwards-compatible: size is optional. When omitted, image fills parent.
  const wrapperStyle = size
    ? { width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }
    : { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={wrapperStyle} aria-hidden="true">
      <img
        src="assets/ui/jma-harp.png"
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default HarpIcon;
