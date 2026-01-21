import type { TripMemberRole } from '@/types/database';

/**
 * Permission actions that can be performed on trips and trip-related content.
 *
 * PERMISSION MATRIX:
 * | Action                | Organizer | Participant |
 * |-----------------------|-----------|-------------|
 * | VIEW_TRIP             | ✓         | ✓           |
 * | EDIT_TRIP             | ✓         | ✗           |
 * | DELETE_TRIP           | ✓         | ✗           |
 * | ARCHIVE_TRIP          | ✓         | ✗           |
 * | INVITE_MEMBERS        | ✓         | ✓           |
 * | REVOKE_ANY_INVITE     | ✓         | ✗           |
 * | MANAGE_MEMBERS        | ✓         | ✗           |
 * | LEAVE_TRIP            | ✓*        | ✓           |
 * | CREATE_ACTIVITY       | ✓         | ✓           |
 * | EDIT_ANY_ACTIVITY     | ✓         | ✗           |
 * | DELETE_ANY_ACTIVITY   | ✓         | ✗           |
 * | CREATE_EXPENSE        | ✓         | ✓           |
 * | EDIT_ANY_EXPENSE      | ✓         | ✗           |
 * | DELETE_ANY_EXPENSE    | ✓         | ✗           |
 * | CREATE_NOTE           | ✓         | ✓           |
 * | EDIT_ANY_NOTE         | ✓         | ✗           |
 * | DELETE_ANY_NOTE       | ✓         | ✗           |
 * | MARK_SETTLEMENT       | ✓         | ✓           |
 *
 * *Organizers can leave only if other organizers exist
 *
 * Note: Users can always edit/delete their OWN content (activities, expenses, notes)
 * regardless of role. The "ANY" suffix indicates managing others' content.
 */
export type PermissionAction =
  // Trip management
  | 'VIEW_TRIP'
  | 'EDIT_TRIP'
  | 'DELETE_TRIP'
  | 'ARCHIVE_TRIP'
  // Member management
  | 'INVITE_MEMBERS'
  | 'REVOKE_ANY_INVITE'
  | 'MANAGE_MEMBERS'
  | 'LEAVE_TRIP'
  // Activity management
  | 'CREATE_ACTIVITY'
  | 'EDIT_ANY_ACTIVITY'
  | 'DELETE_ANY_ACTIVITY'
  // Expense management
  | 'CREATE_EXPENSE'
  | 'EDIT_ANY_EXPENSE'
  | 'DELETE_ANY_EXPENSE'
  // Note management
  | 'CREATE_NOTE'
  | 'EDIT_ANY_NOTE'
  | 'DELETE_ANY_NOTE'
  // Settlement
  | 'MARK_SETTLEMENT';

/**
 * Permissions that require organizer role
 */
export const ORGANIZER_ONLY_ACTIONS: Set<PermissionAction> = new Set([
  'EDIT_TRIP',
  'DELETE_TRIP',
  'ARCHIVE_TRIP',
  'REVOKE_ANY_INVITE',
  'MANAGE_MEMBERS',
  'EDIT_ANY_ACTIVITY',
  'DELETE_ANY_ACTIVITY',
  'EDIT_ANY_EXPENSE',
  'DELETE_ANY_EXPENSE',
  'EDIT_ANY_NOTE',
  'DELETE_ANY_NOTE',
]);

/**
 * Permissions available to any trip member (organizer or participant)
 */
const MEMBER_ACTIONS: Set<PermissionAction> = new Set([
  'VIEW_TRIP',
  'INVITE_MEMBERS',
  'LEAVE_TRIP',
  'CREATE_ACTIVITY',
  'CREATE_EXPENSE',
  'CREATE_NOTE',
  'MARK_SETTLEMENT',
]);

/**
 * Check if a user with the given role can perform the specified action.
 *
 * @param action - The permission action to check
 * @param userRole - The user's role in the trip (null if not a member)
 * @returns true if the user can perform the action
 *
 * @example
 * ```ts
 * // Check if user can edit the trip
 * if (can('EDIT_TRIP', userRole)) {
 *   showEditButton();
 * }
 *
 * // Check multiple permissions
 * const canManage = can('MANAGE_MEMBERS', userRole);
 * const canInvite = can('INVITE_MEMBERS', userRole);
 * ```
 */
export function can(action: PermissionAction, userRole: TripMemberRole | null): boolean {
  // Not a member - no permissions
  if (!userRole) {
    return false;
  }

  // Organizer has all permissions
  if (userRole === 'organizer') {
    return true;
  }

  // Participant can only perform member-level actions
  if (MEMBER_ACTIONS.has(action)) {
    return true;
  }

  return false;
}

/**
 * Check if a user can perform an action on their own content.
 *
 * @param action - The action to check (EDIT or DELETE)
 * @param userRole - The user's role in the trip
 * @param isOwner - Whether the user owns the content
 * @returns true if the user can perform the action
 *
 * @example
 * ```ts
 * // Check if user can edit an expense
 * const canEdit = canOnOwn('EDIT', userRole, expense.paid_by === currentUserId);
 *
 * // Check if user can delete an activity
 * const canDelete = canOnOwn('DELETE', userRole, activity.created_by === currentUserId);
 * ```
 */
export function canOnOwn(
  action: 'EDIT' | 'DELETE',
  userRole: TripMemberRole | null,
  isOwner: boolean
): boolean {
  // Not a member - no permissions
  if (!userRole) {
    return false;
  }

  // Organizers can always edit/delete any content
  if (userRole === 'organizer') {
    return true;
  }

  // Participants can only edit/delete their own content
  return isOwner;
}

/**
 * Check if a user can revoke a specific invite.
 * Users can revoke their own invites, organizers can revoke any invite.
 *
 * @param userRole - The user's role in the trip
 * @param isInviteCreator - Whether the user created the invite
 * @returns true if the user can revoke the invite
 */
export function canRevokeInvite(
  userRole: TripMemberRole | null,
  isInviteCreator: boolean
): boolean {
  if (!userRole) {
    return false;
  }

  // Organizers can revoke any invite
  if (userRole === 'organizer') {
    return true;
  }

  // Members can revoke their own invites
  return isInviteCreator;
}

/**
 * Check if a user can manage (remove/promote) a specific member.
 *
 * @param userRole - The current user's role
 * @param targetRole - The target member's role
 * @param isCurrentUser - Whether the target is the current user
 * @returns true if the user can manage the target member
 */
export function canManageMember(
  userRole: TripMemberRole | null,
  targetRole: TripMemberRole,
  isCurrentUser: boolean
): boolean {
  // Only organizers can manage members
  if (userRole !== 'organizer') {
    return false;
  }

  // Can't manage yourself via this function (use leave instead)
  if (isCurrentUser) {
    return false;
  }

  // Can't manage other organizers
  if (targetRole === 'organizer') {
    return false;
  }

  return true;
}

/**
 * Get all permissions for a given role.
 * Useful for debugging or displaying permission info.
 *
 * @param userRole - The user's role
 * @returns Array of actions the user can perform
 */
export function getPermissions(userRole: TripMemberRole | null): PermissionAction[] {
  if (!userRole) {
    return [];
  }

  const allActions: PermissionAction[] = [
    'VIEW_TRIP',
    'EDIT_TRIP',
    'DELETE_TRIP',
    'ARCHIVE_TRIP',
    'INVITE_MEMBERS',
    'REVOKE_ANY_INVITE',
    'MANAGE_MEMBERS',
    'LEAVE_TRIP',
    'CREATE_ACTIVITY',
    'EDIT_ANY_ACTIVITY',
    'DELETE_ANY_ACTIVITY',
    'CREATE_EXPENSE',
    'EDIT_ANY_EXPENSE',
    'DELETE_ANY_EXPENSE',
    'CREATE_NOTE',
    'EDIT_ANY_NOTE',
    'DELETE_ANY_NOTE',
    'MARK_SETTLEMENT',
  ];

  if (userRole === 'organizer') {
    return allActions;
  }

  return allActions.filter((action) => MEMBER_ACTIONS.has(action));
}

/**
 * Check if the given role is an organizer
 */
export function isOrganizer(userRole: TripMemberRole | null): boolean {
  return userRole === 'organizer';
}

/**
 * Check if the given role is a participant (non-organizer member)
 */
export function isParticipant(userRole: TripMemberRole | null): boolean {
  return userRole === 'participant';
}

/**
 * Check if the user is a member of the trip (any role)
 */
export function isMember(userRole: TripMemberRole | null): boolean {
  return userRole !== null;
}
