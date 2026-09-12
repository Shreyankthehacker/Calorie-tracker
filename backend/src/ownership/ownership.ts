import { AppError } from '../errors/app-error.js';

/**
 * Returns the authenticated owner id.
 * Any client-supplied userId is ignored and cannot override auth identity.
 */
export function resolveOwnerId(authenticatedUserId: string, clientUserId?: string): string {
  void clientUserId;
  return authenticatedUserId;
}

/**
 * Ensures a loaded resource belongs to the authenticated user.
 * Returns 404 (not 403) to avoid leaking existence of other users' resources.
 */
export function assertOwnedByUser<T extends { userId: string }>(
  resource: T | null | undefined,
  authenticatedUserId: string,
): T {
  if (!resource || resource.userId !== authenticatedUserId) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }
  return resource;
}

/** Prisma where-clause fragment scoped to the authenticated user. */
export function ownedBy(authenticatedUserId: string): { userId: string } {
  return { userId: authenticatedUserId };
}
