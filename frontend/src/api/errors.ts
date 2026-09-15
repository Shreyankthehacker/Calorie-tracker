import { ApiError } from './types';

/** Turn API/unknown failures into copy the user can act on. */
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function firstApiErrorMessage(...errors: unknown[]): string | null {
  for (const error of errors) {
    if (error instanceof ApiError && error.message) {
      return error.message;
    }
  }
  return null;
}
