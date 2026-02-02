import type { User } from './types';

/**
 * Checks if a viewer can see hidden users.
 * Admin and Gazzella can see all users including hidden ones.
 */
export function canSeeHiddenUsers(viewer: User | null | undefined): boolean {
  if (!viewer) return false;
  return viewer.role === 'admin';
}

/**
 * Filters users based on visibility rules.
 * If the viewer can see hidden users, returns all users.
 * Otherwise, filters out users with is_hidden = 1.
 */
export function getVisibleUsers<T extends Pick<User, 'is_hidden'>>(
  users: T[],
  viewer: User | null | undefined
): T[] {
  if (canSeeHiddenUsers(viewer)) {
    return users;
  }
  return users.filter(u => !u.is_hidden);
}

/**
 * Checks if a specific user should be visible to the viewer.
 */
export function isUserVisible(
  user: Pick<User, 'is_hidden'> | null | undefined,
  viewer: User | null | undefined
): boolean {
  if (!user) return false;
  if (canSeeHiddenUsers(viewer)) return true;
  return !user.is_hidden;
}
