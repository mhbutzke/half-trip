'use client';

import type { ReactNode } from 'react';
import { can, type PermissionAction } from '@/lib/permissions/trip-permissions';
import type { TripMemberRole } from '@/types/database';

interface PermissionGuardProps {
  /**
   * The permission action required to view the children
   */
  action: PermissionAction;

  /**
   * The user's role in the trip
   */
  userRole: TripMemberRole | null;

  /**
   * Content to render if the user has permission
   */
  children: ReactNode;

  /**
   * Optional content to render if the user doesn't have permission
   * If not provided, nothing is rendered when permission is denied
   */
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions.
 *
 * @example
 * ```tsx
 * // Only show edit button to organizers
 * <PermissionGuard action="EDIT_TRIP" userRole={userRole}>
 *   <Button onClick={handleEdit}>Edit Trip</Button>
 * </PermissionGuard>
 *
 * // Show different content based on permission
 * <PermissionGuard
 *   action="MANAGE_MEMBERS"
 *   userRole={userRole}
 *   fallback={<span>View only</span>}
 * >
 *   <Button onClick={handleRemove}>Remove Member</Button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  action,
  userRole,
  children,
  fallback = null,
}: PermissionGuardProps) {
  if (can(action, userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireOrganizerProps {
  /**
   * The user's role in the trip
   */
  userRole: TripMemberRole | null;

  /**
   * Content to render if the user is an organizer
   */
  children: ReactNode;

  /**
   * Optional content to render if the user is not an organizer
   */
  fallback?: ReactNode;
}

/**
 * Convenience component that only renders children if the user is an organizer.
 *
 * @example
 * ```tsx
 * <RequireOrganizer userRole={userRole}>
 *   <OrganizerOnlyControls />
 * </RequireOrganizer>
 * ```
 */
export function RequireOrganizer({ userRole, children, fallback = null }: RequireOrganizerProps) {
  if (userRole === 'organizer') {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireMemberProps {
  /**
   * The user's role in the trip
   */
  userRole: TripMemberRole | null;

  /**
   * Content to render if the user is a member
   */
  children: ReactNode;

  /**
   * Optional content to render if the user is not a member
   */
  fallback?: ReactNode;
}

/**
 * Convenience component that only renders children if the user is a trip member.
 *
 * @example
 * ```tsx
 * <RequireMember userRole={userRole}>
 *   <MemberOnlyContent />
 * </RequireMember>
 * ```
 */
export function RequireMember({ userRole, children, fallback = null }: RequireMemberProps) {
  if (userRole !== null) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
