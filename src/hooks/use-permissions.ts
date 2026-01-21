import { useMemo } from 'react';
import {
  can,
  canOnOwn,
  canRevokeInvite,
  canManageMember,
  isOrganizer,
  isParticipant,
  isMember,
  type PermissionAction,
} from '@/lib/permissions/trip-permissions';
import type { TripMemberRole } from '@/types/database';

export interface UsePermissionsOptions {
  userRole: TripMemberRole | null;
  currentUserId?: string;
}

export interface UsePermissionsResult {
  /**
   * Check if the user can perform the specified action
   */
  can: (action: PermissionAction) => boolean;

  /**
   * Check if the user can edit/delete their own content
   */
  canOnOwn: (action: 'EDIT' | 'DELETE', ownerId: string | undefined) => boolean;

  /**
   * Check if the user can revoke a specific invite
   */
  canRevokeInvite: (inviteCreatorId: string) => boolean;

  /**
   * Check if the user can manage (remove/promote) a specific member
   */
  canManageMember: (targetRole: TripMemberRole, targetUserId: string) => boolean;

  /**
   * Whether the user is an organizer
   */
  isOrganizer: boolean;

  /**
   * Whether the user is a participant (non-organizer)
   */
  isParticipant: boolean;

  /**
   * Whether the user is a member of the trip (any role)
   */
  isMember: boolean;

  /**
   * The user's role in the trip
   */
  userRole: TripMemberRole | null;
}

/**
 * Hook for checking user permissions within a trip context.
 *
 * @param options - The user role and optional current user ID
 * @returns Permission checking functions and role status
 *
 * @example
 * ```tsx
 * function TripActions({ userRole, currentUserId }: Props) {
 *   const permissions = usePermissions({ userRole, currentUserId });
 *
 *   return (
 *     <div>
 *       {permissions.can('EDIT_TRIP') && (
 *         <Button onClick={handleEdit}>Edit Trip</Button>
 *       )}
 *       {permissions.canOnOwn('DELETE', expense.paid_by) && (
 *         <Button onClick={handleDelete}>Delete Expense</Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions({
  userRole,
  currentUserId,
}: UsePermissionsOptions): UsePermissionsResult {
  return useMemo(() => {
    return {
      can: (action: PermissionAction) => can(action, userRole),

      canOnOwn: (action: 'EDIT' | 'DELETE', ownerId: string | undefined) => {
        const isOwner = currentUserId !== undefined && ownerId === currentUserId;
        return canOnOwn(action, userRole, isOwner);
      },

      canRevokeInvite: (inviteCreatorId: string) => {
        const isCreator = currentUserId === inviteCreatorId;
        return canRevokeInvite(userRole, isCreator);
      },

      canManageMember: (targetRole: TripMemberRole, targetUserId: string) => {
        const isCurrentUser = currentUserId === targetUserId;
        return canManageMember(userRole, targetRole, isCurrentUser);
      },

      isOrganizer: isOrganizer(userRole),
      isParticipant: isParticipant(userRole),
      isMember: isMember(userRole),
      userRole,
    };
  }, [userRole, currentUserId]);
}
