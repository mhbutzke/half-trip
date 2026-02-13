import { describe, it, expect } from 'vitest';
import { generatePixPayload, isValidPixKey, detectPixKeyType } from './pix';

describe('generatePixPayload', () => {
  it('should generate valid EMV payload for CPF key', () => {
    const payload = generatePixPayload({
      key: '12345678901',
      name: 'Maria Silva',
      city: 'Sao Paulo',
      amount: 150.5,
    });

    // EMV payloads start with '00' (Payload Format Indicator)
    expect(payload).toMatch(/^00/);
    // Must contain the Pix merchant account info (ID 26)
    expect(payload).toContain('0014br.gov.bcb.pix');
    // Must contain the amount
    expect(payload).toContain('150.50');
    // Must end with CRC16 (4 hex chars)
    expect(payload).toMatch(/[0-9A-F]{4}$/);
  });

  it('should generate valid payload without amount (open value)', () => {
    const payload = generatePixPayload({
      key: 'maria@email.com',
      name: 'Maria',
      city: 'SP',
    });

    expect(payload).toMatch(/^00/);
    expect(payload).toContain('0014br.gov.bcb.pix');
    // Should NOT contain ID 54 (amount) when no amount
    expect(payload).not.toMatch(/54\d{2}/);
  });

  it('should generate payload with transaction ID', () => {
    const payload = generatePixPayload({
      key: '+5511999999999',
      name: 'Joao',
      city: 'RJ',
      amount: 50,
      txId: 'HALFTRIP123',
    });

    expect(payload).toContain('HALFTRIP123');
  });
});

describe('isValidPixKey', () => {
  it('should validate CPF (11 digits)', () => {
    expect(isValidPixKey('12345678901')).toBe(true);
  });

  it('should validate CNPJ (14 digits)', () => {
    expect(isValidPixKey('12345678000190')).toBe(true);
  });

  it('should validate email', () => {
    expect(isValidPixKey('user@example.com')).toBe(true);
  });

  it('should validate phone with country code', () => {
    expect(isValidPixKey('+5511999999999')).toBe(true);
  });

  it('should validate random key (UUID format)', () => {
    expect(isValidPixKey('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidPixKey('')).toBe(false);
  });
});

describe('detectPixKeyType', () => {
  it('should detect CPF', () => {
    expect(detectPixKeyType('12345678901')).toBe('cpf');
  });

  it('should detect email', () => {
    expect(detectPixKeyType('user@test.com')).toBe('email');
  });

  it('should detect phone', () => {
    expect(detectPixKeyType('+5511999999999')).toBe('phone');
  });

  it('should detect random key', () => {
    expect(detectPixKeyType('123e4567-e89b-12d3-a456-426614174000')).toBe('random');
  });
});
