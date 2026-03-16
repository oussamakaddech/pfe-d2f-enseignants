import type { Id } from "./common";

export interface RiceResult {
  id?: Id;
  score?: number;
  recommendations?: string[];
  raw?: unknown;
}
