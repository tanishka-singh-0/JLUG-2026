import events from "./events.json";

export type EventRecord = {
  id: string;
  tag: string;
  date: string;
  name: string;
  description: string;
  participants?: string;
  teams?: string;
  status: string;
  images: string[];
};

export const EVENTS: EventRecord[] = events;
