import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Sınıf birleştirici: clsx + tailwind-merge (sonra gelen sınıf kazanır). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
