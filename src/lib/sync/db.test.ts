import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  db,
  initializeDB,
  clearAllCache,
  getDatabaseStats,
  type CachedTrip,
  type CachedActivity,
} from './db';

describe('IndexedDB Schema', () => {
  beforeEach(async () => {
    await initializeDB();
    await clearAllCache();
  });

  afterEach(async () => {
    await clearAllCache();
  });

  describe('Database Initialization', () => {
    it('should initialize database successfully', async () => {
      await initializeDB();
      expect(db.isOpen()).toBe(true);
    });

    it('should have all required tables', () => {
      expect(db.users).toBeDefined();
      expect(db.trips).toBeDefined();
      expect(db.trip_members).toBeDefined();
      expect(db.activities).toBeDefined();
      expect(db.expenses).toBeDefined();
      expect(db.expense_splits).toBeDefined();
      expect(db.trip_notes).toBeDefined();
      expect(db.sync_queue).toBeDefined();
    });
  });

  describe('Trip Operations', () => {
    it('should insert and retrieve a trip', async () => {
      const trip: CachedTrip = {
        id: 'trip-1',
        name: 'Test Trip',
        destination: 'Paris',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
        description: 'A test trip',
        cover_url: null,
        style: 'cultural',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        _syncStatus: 'synced',
      };

      await db.trips.add(trip);
      const retrieved = await db.trips.get('trip-1');

      expect(retrieved).toMatchObject({
        id: 'trip-1',
        name: 'Test Trip',
        destination: 'Paris',
      });
    });

    it('should update trip sync status', async () => {
      const trip: CachedTrip = {
        id: 'trip-2',
        name: 'Trip 2',
        destination: 'London',
        start_date: '2025-07-01',
        end_date: '2025-07-05',
        description: null,
        cover_url: null,
        style: null,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        _syncStatus: 'pending',
      };

      await db.trips.add(trip);
      await db.trips.update('trip-2', { _syncStatus: 'synced' });

      const updated = await db.trips.get('trip-2');
      expect(updated?._syncStatus).toBe('synced');
    });

    it('should query trips by created_by', async () => {
      const trips: CachedTrip[] = [
        {
          id: 'trip-3',
          name: 'Trip 3',
          destination: 'Rome',
          start_date: '2025-08-01',
          end_date: '2025-08-05',
          description: null,
          cover_url: null,
          style: null,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived_at: null,
          _syncStatus: 'synced',
        },
        {
          id: 'trip-4',
          name: 'Trip 4',
          destination: 'Berlin',
          start_date: '2025-09-01',
          end_date: '2025-09-05',
          description: null,
          cover_url: null,
          style: null,
          created_by: 'user-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived_at: null,
          _syncStatus: 'synced',
        },
      ];

      await db.trips.bulkAdd(trips);
      const userTrips = await db.trips.where('created_by').equals('user-1').toArray();

      expect(userTrips).toHaveLength(1);
      expect(userTrips[0].id).toBe('trip-3');
    });
  });

  describe('Activity Operations', () => {
    it('should insert and retrieve activities', async () => {
      const activity: CachedActivity = {
        id: 'activity-1',
        trip_id: 'trip-1',
        title: 'Visit Eiffel Tower',
        date: '2025-06-02',
        start_time: '10:00',
        duration_minutes: 120,
        location: 'Eiffel Tower',
        description: 'Visit the iconic Eiffel Tower',
        category: 'tour',
        links: JSON.stringify([]),
        metadata: JSON.stringify({}),
        sort_order: 0,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _syncStatus: 'synced',
      };

      await db.activities.add(activity);
      const retrieved = await db.activities.get('activity-1');

      expect(retrieved).toMatchObject({
        id: 'activity-1',
        title: 'Visit Eiffel Tower',
        trip_id: 'trip-1',
      });
    });

    it('should query activities by trip_id and date', async () => {
      const activities: CachedActivity[] = [
        {
          id: 'activity-2',
          trip_id: 'trip-1',
          title: 'Activity 1',
          date: '2025-06-02',
          start_time: null,
          duration_minutes: null,
          location: null,
          description: null,
          category: 'other',
          links: JSON.stringify([]),
          metadata: JSON.stringify({}),
          sort_order: 0,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _syncStatus: 'synced',
        },
        {
          id: 'activity-3',
          trip_id: 'trip-1',
          title: 'Activity 2',
          date: '2025-06-03',
          start_time: null,
          duration_minutes: null,
          location: null,
          description: null,
          category: 'other',
          links: JSON.stringify([]),
          metadata: JSON.stringify({}),
          sort_order: 1,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _syncStatus: 'synced',
        },
      ];

      await db.activities.bulkAdd(activities);
      const tripActivities = await db.activities
        .where('[trip_id+date]')
        .equals(['trip-1', '2025-06-02'])
        .toArray();

      expect(tripActivities).toHaveLength(1);
      expect(tripActivities[0].id).toBe('activity-2');
    });
  });

  describe('Sync Queue Operations', () => {
    it('should add entry to sync queue', async () => {
      await db.sync_queue.add({
        timestamp: new Date().toISOString(),
        table: 'trips',
        operation: 'insert',
        recordId: 'trip-1',
        data: { name: 'Test Trip' },
        retries: 0,
      });

      const queueEntries = await db.sync_queue.toArray();
      expect(queueEntries).toHaveLength(1);
      expect(queueEntries[0].table).toBe('trips');
      expect(queueEntries[0].operation).toBe('insert');
    });

    it('should auto-increment sync queue ids', async () => {
      await db.sync_queue.add({
        timestamp: new Date().toISOString(),
        table: 'activities',
        operation: 'update',
        recordId: 'activity-1',
        data: {},
        retries: 0,
      });

      await db.sync_queue.add({
        timestamp: new Date().toISOString(),
        table: 'expenses',
        operation: 'delete',
        recordId: 'expense-1',
        data: {},
        retries: 0,
      });

      const entries = await db.sync_queue.toArray();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBeDefined();
      expect(entries[1].id).toBeDefined();
      expect(entries[0].id).not.toBe(entries[1].id);
    });
  });

  describe('Database Statistics', () => {
    it('should return accurate database statistics', async () => {
      // Add sample data
      await db.trips.add({
        id: 'trip-1',
        name: 'Trip',
        destination: 'Paris',
        start_date: '2025-06-01',
        end_date: '2025-06-05',
        description: null,
        cover_url: null,
        style: null,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        _syncStatus: 'synced',
      });

      await db.activities.bulkAdd([
        {
          id: 'activity-1',
          trip_id: 'trip-1',
          title: 'Activity 1',
          date: '2025-06-02',
          start_time: null,
          duration_minutes: null,
          location: null,
          description: null,
          category: 'other',
          links: JSON.stringify([]),
          sort_order: 0,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _syncStatus: 'synced',
        },
        {
          id: 'activity-2',
          trip_id: 'trip-1',
          title: 'Activity 2',
          date: '2025-06-03',
          start_time: null,
          duration_minutes: null,
          location: null,
          description: null,
          category: 'other',
          links: JSON.stringify([]),
          sort_order: 1,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _syncStatus: 'synced',
        },
      ]);

      const stats = await getDatabaseStats();

      expect(stats.trips).toBe(1);
      expect(stats.activities).toBe(2);
      expect(stats.total).toBe(3);
    });
  });

  describe('Clear Cache', () => {
    it('should clear all cached data', async () => {
      await db.trips.add({
        id: 'trip-1',
        name: 'Trip',
        destination: 'Paris',
        start_date: '2025-06-01',
        end_date: '2025-06-05',
        description: null,
        cover_url: null,
        style: null,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        _syncStatus: 'synced',
      });

      await db.activities.add({
        id: 'activity-1',
        trip_id: 'trip-1',
        title: 'Activity',
        date: '2025-06-02',
        start_time: null,
        duration_minutes: null,
        location: null,
        description: null,
        category: 'other',
        links: JSON.stringify([]),
        sort_order: 0,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _syncStatus: 'synced',
      });

      let stats = await getDatabaseStats();
      expect(stats.total).toBe(2);

      await clearAllCache();

      stats = await getDatabaseStats();
      expect(stats.total).toBe(0);
    });
  });
});
