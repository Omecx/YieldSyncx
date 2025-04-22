import type { UserRole } from '$lib/types';

interface RouteConfig {
  path: string;
  roles: UserRole[];
}

export function hasRouteAccess(
  path: string,
  userRoles: UserRole[],
  routes: RouteConfig[]
): boolean {
  const routeConfig = routes.find((route) => route.path === path);
  if (!routeConfig) return false;
  if (routeConfig.roles.length === 0) return true;
  return routeConfig.roles.some((role) => userRoles.includes(role));
}
