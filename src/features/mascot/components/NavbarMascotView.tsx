/**
 * Presentation for the navbar mascot. Hook-free and entirely prop-driven, so it
 * renders identically for any view model and can be tested without a state
 * machine, a network or a media query.
 *
 * It makes no playback decisions and holds no literals beyond Tailwind classes:
 * the size, the accessible name and the image source all arrive as props.
 */

import type { NavbarMascotViewModel } from "../hooks/useNavbarMascot";

export default function NavbarMascotView({
  imageSrc,
  imageKey,
  sizePx,
  accessibleName,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onActivate,
  onImageError,
}: NavbarMascotViewModel) {
  return (
    <button
      type="button"
      aria-label={accessibleName}
      onClick={onActivate}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      // Inline, not a Tailwind class: the box must be exactly the configured
      // size so the reserved area matches the image's width/height attributes
      // and the still→clip swap contributes zero layout shift.
      style={{ width: sizePx, height: sizePx }}
      className="grid shrink-0 place-items-center bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent"
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- animated GIF driven by blob: URLs; next/image needs `unoptimized` for GIFs and cannot take blob sources, so it would reduce to this anyway.
        <img
          // A new key forces a fresh element whenever a fresh resource is
          // required, which is half of restarting a GIF at frame 0.
          key={imageKey}
          src={imageSrc}
          // Decorative: the button's aria-label is the whole accessible name,
          // so assistive tech should not announce the image as well.
          alt=""
          aria-hidden="true"
          width={sizePx}
          height={sizePx}
          draggable={false}
          decoding="async"
          onError={onImageError}
          className="h-full w-full object-contain"
        />
      ) : null}
    </button>
  );
}
