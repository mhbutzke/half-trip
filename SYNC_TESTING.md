# Sync and Conflict Resolution - Testing Guide

This document describes how to test the sync and conflict resolution functionality in Half Trip.

## Features Implemented

### ✅ Automatic Sync on Network Reconnect

- The app automatically syncs pending changes when the network connection is restored
- Uses `useAutoSync` hook with network status detection
- Triggered by `useOnlineStatus` hook monitoring `navigator.onLine`

### ✅ Last-Write-Wins Conflict Resolution

- Implements timestamp-based conflict detection using `updated_at` and `_locallyModifiedAt`
- When a conflict is detected (remote version newer than local modification):
  - Logs a warning to console
  - Proceeds with local update (last-write-wins strategy)
  - Overwrites remote changes

### ✅ Graceful Error Handling

- Errors are categorized into types:
  - **Network errors**: Retryable (fetch failures, timeouts)
  - **Permission errors**: Non-retryable (RLS violations, unauthorized)
  - **Validation errors**: Non-retryable (constraint violations)
  - **Conflict errors**: Retryable (duplicate keys)
  - **Unknown errors**: Retryable (cautious approach)
- Up to 3 retry attempts for retryable errors
- User-friendly toast notifications for different error types

### ✅ Sync Status UI

- **SyncStatus** component in header shows:
  - Online/offline indicator
  - Pending changes count
  - Syncing animation
  - Error state with alert icon
  - Last sync time
  - Click to manually trigger sync
- **PendingIndicator** component on individual items shows:
  - Cloud icon for synced items
  - CloudOff icon for pending items
  - Loader animation for syncing items
  - Alert triangle for errors

### ✅ Manual Retry for Failed Syncs

- **SyncErrorsDialog** component provides:
  - List of all failed sync entries
  - Error type badges (Network, Permission, Validation, Conflict)
  - Retry count display
  - "Retry All" button to reset retry counters and re-sync
  - "Clear All" button to remove failed entries
  - Accessible by clicking sync status when errors exist

## Testing Scenarios

### Scenario 1: Basic Offline Write and Sync

**Steps:**

1. Open the app while online
2. Navigate to a trip
3. Disconnect from network (toggle offline in Chrome DevTools)
4. Create a new activity/expense/note
5. Verify the item appears with a "pending" indicator
6. Reconnect to network
7. Verify the sync status shows "Syncing..." then "Synced"
8. Verify the pending indicator disappears
9. Refresh the page - verify the item persists

**Expected Result:**

- ✅ Item created successfully while offline
- ✅ Item shows pending indicator
- ✅ Automatic sync on reconnect
- ✅ Item persists after sync

### Scenario 2: Multiple Offline Changes

**Steps:**

1. Go offline
2. Create 3 activities
3. Edit 2 existing expenses
4. Delete 1 note
5. Check sync status - should show "5 alterações pendentes"
6. Go online
7. Wait for automatic sync

**Expected Result:**

- ✅ All 5 operations queued
- ✅ Sync processes all entries in order (FIFO)
- ✅ Success toast shows "5 itens" synced

### Scenario 3: Conflict Resolution

**Steps:**

1. Open trip in two browser tabs (Tab A and Tab B)
2. In Tab A: Edit activity title to "Morning Hike"
3. In Tab B: Edit same activity title to "Beach Walk"
4. In Tab A: Go offline
5. In Tab A: Edit activity title again to "Mountain Climb"
6. In Tab A: Go online - triggers sync
7. Verify final state

**Expected Result:**

- ✅ Console shows conflict warning
- ✅ Tab A's change wins (last-write-wins)
- ✅ Final activity title is "Mountain Climb"
- ✅ Tab B receives realtime update

### Scenario 4: Network Error Handling

**Steps:**

1. Create an activity while offline
2. Stay offline
3. Click sync button (should be disabled)
4. Go online
5. Use DevTools Network tab to throttle to "Slow 3G"
6. Observe sync behavior

**Expected Result:**

- ✅ Sync retries network errors up to 3 times
- ✅ Toast shows warning for retryable errors
- ✅ Eventually succeeds or fails permanently

### Scenario 5: Permission Error Handling

**Steps:**

1. Join a trip as a participant (not organizer)
2. Go offline
3. Try to delete someone else's expense (edit in IndexedDB directly)
4. Go online
5. Observe sync error

**Expected Result:**

- ✅ Sync fails with permission error
- ✅ Error categorized as "permission" (non-retryable)
- ✅ Sync status shows error state
- ✅ Click sync status opens error dialog
- ✅ Error badge shows "Permissão"

### Scenario 6: Manual Retry

**Steps:**

1. Create a sync error (simulate by editing IndexedDB with invalid data)
2. Let sync fail 3 times
3. Click sync status in header
4. Verify error dialog opens
5. Click "Tentar Novamente"

**Expected Result:**

- ✅ Error dialog shows failed entries
- ✅ Retry resets retry counter
- ✅ Sync attempts again
- ✅ Can manually clear failed entries

### Scenario 7: Duplicate Key Handling

**Steps:**

1. Create activity A while offline
2. Before syncing, delete activity A from Supabase directly
3. Create activity B with same ID in another tab (unlikely but possible)
4. Sync

**Expected Result:**

- ✅ INSERT detects duplicate key error
- ✅ Converts to UPDATE operation
- ✅ Sync succeeds

### Scenario 8: Already-Deleted Record

**Steps:**

1. Go offline
2. Delete an activity
3. In another tab (online), delete the same activity
4. Go back online in first tab
5. Sync

**Expected Result:**

- ✅ DELETE operation finds record already deleted
- ✅ Logs warning but doesn't error
- ✅ Sync succeeds (desired end state achieved)

### Scenario 9: Periodic Sync

**Steps:**

1. Configure `useAutoSync` with `syncInterval: 60000` (1 minute)
2. Make offline changes
3. Wait 1 minute while online

**Expected Result:**

- ✅ Sync triggers automatically every minute
- ✅ Pending changes sync without user action

### Scenario 10: Offline Read Access

**Steps:**

1. View a trip while online (caches data)
2. Go offline
3. Navigate to the trip
4. View activities, expenses, notes

**Expected Result:**

- ✅ Trip loads from IndexedDB
- ✅ All previously viewed data accessible
- ✅ Offline indicator shows at top
- ✅ Can view but changes are queued

## Developer Tools

### Chrome DevTools for Offline Testing

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" to simulate no connection
4. Or throttle to "Slow 3G" for network errors

### IndexedDB Inspection

1. Open DevTools → Application tab
2. Expand IndexedDB → half_trip_db
3. Inspect tables:
   - `sync_queue`: View pending operations
   - `activities`, `expenses`, etc.: View cached data with `_syncStatus`

### Console Logging

All sync operations log to console with `[SyncEngine]` prefix:

- `Processing insert on activities: abc123`
- `Conflict detected for activities:abc123 - remote version is newer`
- `Successfully updated activities:abc123`

## Error Types Reference

| Error Type   | Retryable | Examples                           |
| ------------ | --------- | ---------------------------------- |
| `network`    | ✅ Yes    | fetch failed, connection timeout   |
| `permission` | ❌ No     | RLS violation, unauthorized        |
| `validation` | ❌ No     | constraint violation, invalid data |
| `conflict`   | ✅ Yes    | duplicate key                      |
| `unknown`    | ✅ Yes    | any other error                    |

## Verification Checklist

- ✅ Automatic sync on network reconnect
- ✅ Last-write-wins conflict resolution
- ✅ Graceful error handling with user feedback
- ✅ Sync status shown in UI (syncing, synced, error)
- ✅ Manual retry for failed syncs
- ✅ Offline read capability with cached data
- ✅ Offline write with sync queue
- ✅ Pending indicators on individual items
- ✅ Toast notifications for sync events
- ✅ Error dialog for detailed error management
