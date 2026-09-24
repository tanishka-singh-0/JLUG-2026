"use client";

import type { EventRecord } from "@/data/events";
import { useEffect, useState } from "react";

type EventCardProps = {
  event: EventRecord;
  year?: string;
};

export default function EventCard({ event, year = "2026" }: EventCardProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const stats = [
    ["PARTICIPANTS", event.participants],
    ["TEAMS", event.teams],
  ].filter(([, value]) => value);
  const firstImage = event.images[0];

  useEffect(() => {
    if (!galleryOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [galleryOpen]);

  return (
    <>
      <article className="group relative border border-jlug-line bg-jlug-ink">
        <div className="pointer-events-none absolute -top-12 -right-4 z-0 w-full overflow-hidden truncate text-right text-[15vw] font-bold text-jlug-surface-raised opacity-20">
          {year}
        </div>

        <div className="relative z-10 flex flex-col gap-12 p-6 md:p-12 lg:flex-row">
          <div className="flex-1">
            <div className="mb-8 flex flex-wrap gap-2 font-mono text-xs text-jlug-gray-1">
              <span className="border border-jlug-line px-2 py-1">
                TAG: {event.tag}
              </span>
              <span className="border border-jlug-line px-2 py-1">
                DATE: {event.date}
              </span>
            </div>
            <h2 className="mb-6 text-6xl font-bold uppercase leading-[0.85] tracking-tighter md:text-8xl">
              {event.name.split(" ").map((word, index) => (
                <span className="block" key={`${event.id}-${word}-${index}`}>
                  {word}
                </span>
              ))}
            </h2>
            <p className="mb-8 max-w-md text-xl text-jlug-gray-1">
              {event.description}
            </p>
            <table className="w-full max-w-xs font-mono text-sm text-jlug-gray-2">
              <tbody>
                {stats.map(([label, value]) => (
                  <tr className="border-b border-jlug-line/50" key={label}>
                    <td className="py-2">{label}</td>
                    <td className="text-right text-jlug-white">{value}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2">STATUS</td>
                  <td className="text-right text-jlug-accent">{event.status}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="relative w-full lg:w-1/2">
            <button
              type="button"
              onClick={() => firstImage && setGalleryOpen(true)}
              disabled={!firstImage}
              aria-label={
                firstImage
                  ? `Open ${event.name} image gallery`
                  : `${event.name} has no images yet`
              }
              className="relative block aspect-video w-full border border-jlug-line bg-jlug-black p-2 text-left transition-colors hover:border-jlug-gray-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent disabled:cursor-default"
            >
              {firstImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstImage}
                  alt={`${event.name} event`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-jlug-surface font-mono text-xs text-jlug-gray-2">
                  [ IMAGE_PENDING ]
                </span>
              )}
              {event.images.length > 0 && (
                <span className="absolute right-4 bottom-4 bg-jlug-black/90 px-3 py-2 font-mono text-xs uppercase tracking-widest text-jlug-white">
                  {event.images.length}{" "}
                  {event.images.length === 1 ? "IMAGE" : "IMAGES"}
                </span>
              )}
            </button>
          </div>
        </div>
      </article>

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-jlug-black/95 p-6 md:p-12"
          role="dialog"
          aria-modal="true"
          aria-label={`${event.name} image gallery`}
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="mx-auto max-w-6xl"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between border-b border-jlug-line pb-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-jlug-accent">
                  {event.images.length}{" "}
                  {event.images.length === 1 ? "IMAGE" : "IMAGES"}
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase md:text-5xl">
                  {event.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="border border-jlug-line px-4 py-2 font-mono text-xs uppercase text-jlug-gray-1 hover:bg-jlug-white hover:text-jlug-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jlug-accent"
              >
                CLOSE [X]
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {event.images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${event.id}-${image}`}
                  src={image}
                  alt={`${event.name} image ${index + 1}`}
                  className="w-full border border-jlug-line bg-jlug-surface object-contain"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
