/**
 * Fixed grid + corner crosshairs that sit behind every page.
 *
 * Lives in the root layout so the landing page and the section pages share
 * the same environment. Purely decorative, hence aria-hidden.
 */
export default function StudioBackdrop() {
  return (
    <div aria-hidden="true">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-jlug-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-jlug-line) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
        <div className="absolute top-8 left-8 h-4 w-4 border-t border-l border-jlug-gray-2" />
        <div className="absolute top-8 right-8 h-4 w-4 border-t border-r border-jlug-gray-2" />
        <div className="absolute bottom-8 left-8 h-4 w-4 border-b border-l border-jlug-gray-2" />
        <div className="absolute bottom-8 right-8 h-4 w-4 border-b border-r border-jlug-gray-2" />
        <div className="absolute top-0 bottom-0 left-12 w-px bg-jlug-line" />
        <div className="absolute top-0 bottom-0 right-12 w-px bg-jlug-line" />
      </div>
    </div>
  );
}
