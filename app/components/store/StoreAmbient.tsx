/**
 * Fixed ambient mesh behind storefront pages — Apple liquid-glass canvas.
 * Sits behind all content; pointer-events none.
 */
export default function StoreAmbient() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base mesh */}
      <div className="liquid-canvas absolute inset-0" />

      {/* Soft orbs — depth without clutter */}
      <div
        className="absolute -left-[20%] top-[-10%] h-[55vh] w-[55vw] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(88, 56, 160, 0.35) 0%, transparent 68%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute -right-[15%] top-[20%] h-[45vh] w-[45vw] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(120, 80, 200, 0.22) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-[-5%] left-[30%] h-[40vh] w-[50vw] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(248, 218, 8, 0.06) 0%, transparent 65%)",
          filter: "blur(90px)",
        }}
      />

      {/* Subtle noise grain for material depth */}
      <div className="liquid-grain absolute inset-0 opacity-[0.35]" />
    </div>
  );
}
