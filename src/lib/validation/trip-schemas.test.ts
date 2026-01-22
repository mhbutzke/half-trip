/**
 * Unit Tests for Trip Validation Schemas
 *
 * These tests verify the trip form validation logic,
 * including trip creation and updates.
 */

import { describe, it, expect } from 'vitest';
import { createTripSchema, updateTripSchema } from './trip-schemas';

describe('Trip Validation Schemas', () => {
  describe('createTripSchema', () => {
    it('should accept valid trip data', () => {
      const validData = {
        name: 'Viagem para Paris',
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
        description: 'Uma viagem incrível',
        style: 'cultural' as const,
      };

      const result = createTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept trip without optional fields', () => {
      const validData = {
        name: 'Viagem para Paris',
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Nome da viagem é obrigatório');
      }
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'P',
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('pelo menos 2 caracteres');
      }
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no máximo 100 caracteres');
      }
    });

    it('should reject empty destination', () => {
      const invalidData = {
        name: 'Viagem para Paris',
        destination: '',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Destino é obrigatório');
      }
    });

    it('should reject destination longer than 200 characters', () => {
      const invalidData = {
        name: 'Viagem',
        destination: 'A'.repeat(201),
        start_date: '2025-06-01',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no máximo 200 caracteres');
      }
    });

    it('should reject empty start_date', () => {
      const invalidData = {
        name: 'Viagem para Paris',
        destination: 'Paris, França',
        start_date: '',
        end_date: '2025-06-10',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Data de início é obrigatória');
      }
    });

    it('should reject empty end_date', () => {
      const invalidData = {
        name: 'Viagem para Paris',
        destination: 'Paris, França',
        start_date: '2025-06-01',
        end_date: '',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Data de término é obrigatória');
      }
    });

    it('should reject end_date before start_date', () => {
      const invalidData = {
        name: 'Viagem para Paris',
        destination: 'Paris, França',
        start_date: '2025-06-10',
        end_date: '2025-06-01',
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('posterior à data de início');
      }
    });

    it('should accept same start_date and end_date', () => {
      const validData = {
        name: 'Day Trip',
        destination: 'São Paulo',
        start_date: '2025-06-01',
        end_date: '2025-06-01',
      };

      const result = createTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 1000 characters', () => {
      const invalidData = {
        name: 'Viagem',
        destination: 'Paris',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
        description: 'A'.repeat(1001),
      };

      const result = createTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no máximo 1000 caracteres');
      }
    });

    it('should accept all valid trip styles', () => {
      const validStyles = ['adventure', 'relaxation', 'cultural', 'gastronomic', 'other'] as const;

      for (const style of validStyles) {
        const data = {
          name: 'Viagem',
          destination: 'Destino',
          start_date: '2025-06-01',
          end_date: '2025-06-10',
          style,
        };

        const result = createTripSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should accept null style', () => {
      const validData = {
        name: 'Viagem',
        destination: 'Destino',
        start_date: '2025-06-01',
        end_date: '2025-06-10',
        style: null,
      };

      const result = createTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateTripSchema', () => {
    it('should accept partial updates', () => {
      const validData = {
        name: 'Novo Nome',
      };

      const result = updateTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept updating only dates', () => {
      const validData = {
        start_date: '2025-07-01',
        end_date: '2025-07-10',
      };

      const result = updateTripSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate date constraints even on partial update', () => {
      const invalidData = {
        start_date: '2025-07-10',
        end_date: '2025-07-01',
      };

      const result = updateTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty object', () => {
      const result = updateTripSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate name length if provided', () => {
      const invalidData = {
        name: 'A'.repeat(101),
      };

      const result = updateTripSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
