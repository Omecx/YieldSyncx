// src/lib/utils/navigation.ts
import { page } from '$app/state';

/**
 * Retrieves the current route path.
 * @returns The current URL pathname.
 */
export function getRoutePath(): string {
  return page.url.pathname;
}

/**
 * Checks if the current path matches a given path.
 * @param routePath - The path to compare against.
 * @returns True if the current path matches the provided routePath.
 */
export function isCurrentRoute(routePath: string): boolean {
  return page.url.pathname === routePath;
}
