import { createStore } from "../../lib/store";

export interface ActiveAnnotation {
  path: string;
  name: string;
  thumb: string | null;
  width?: number;
  height?: number;
}

export const activeAnnotation = createStore<ActiveAnnotation | null>(null);

export function openAnnotation(target: ActiveAnnotation) {
  activeAnnotation.set(target);
}

export function closeAnnotation() {
  activeAnnotation.set(null);
}
