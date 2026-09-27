This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Navbar mascot clips

The animated mascot in the top-right of the navigation bar plays GIFs generated
from the source videos in `assets/mascot/`. Those sources are read-only; every
served asset under `public/assets/mascot/` is generated.

```bash
npm run mascot:clips          # regenerate the still, the clips and the manifest
npm run mascot:clips:verify   # check that ffmpeg/ffprobe are invocable, then stop
npm run mascot:clips:probe    # advisory scene-change probe, writes nothing
```

`npm run mascot:clips` requires **ffmpeg and ffprobe**. If they are missing the
pipeline installs them through winget (falling back to Chocolatey) and
re-verifies. To point at an existing build instead, set `MASCOT_FFMPEG_BIN` and
`MASCOT_FFPROBE_BIN`.

To change which moments become clips:

1. Run `npm run mascot:clips:probe` to see candidate cut points. The probe is
   advisory only — it never edits the config, which is what keeps reruns
   reproducible.
2. Review the footage and edit `SEGMENTS` in
   `scripts/mascot-clips/clipPipelineConfig.mjs`. That file holds every tunable:
   segment boundaries, the crop rectangles, output size, the frame-rate and
   palette ladder, and the size budgets.
3. Re-run `npm run mascot:clips`. Clip roles (`idle` / `hover` / `activate`) are
   assigned by id in `src/features/mascot/data/navbarMascotClips.ts`.

`src/features/mascot/data/navbarMascotClipManifest.generated.ts` is written by
the pipeline and should not be hand-edited — every value in it is measured from
the produced files with ffprobe.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
