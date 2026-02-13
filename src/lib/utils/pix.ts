/**
 * Pix EMV QR Code Payload Generator
 *
 * Follows the EMV QRCPS standard used by Banco Central do Brasil.
 * Reference: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II-ManualdePadroesparaIniciacaodoPix.pdf
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface PixPayloadInput {
  key: string;
  name: string;
  city: string;
  amount?: number;
  txId?: string;
}

/**
 * Generate a Pix EMV payload string for QR code generation.
 */
export function generatePixPayload(input: PixPayloadInput): string {
  const { key, name, city, amount, txId } = input;

  const fields: string[] = [];

  // ID 00 - Payload Format Indicator (mandatory, fixed "01")
  fields.push(tlv('00', '01'));

  // ID 26 - Merchant Account Information (Pix)
  const pixFields: string[] = [];
  pixFields.push(tlv('00', 'br.gov.bcb.pix')); // GUI
  pixFields.push(tlv('01', key)); // Chave Pix
  fields.push(tlv('26', pixFields.join('')));

  // ID 52 - Merchant Category Code (0000 = not informed)
  fields.push(tlv('52', '0000'));

  // ID 53 - Transaction Currency (986 = BRL)
  fields.push(tlv('53', '986'));

  // ID 54 - Transaction Amount (optional)
  if (amount !== undefined && amount > 0) {
    fields.push(tlv('54', amount.toFixed(2)));
  }

  // ID 58 - Country Code
  fields.push(tlv('58', 'BR'));

  // ID 59 - Merchant Name (max 25 chars)
  fields.push(tlv('59', sanitize(name, 25)));

  // ID 60 - Merchant City (max 15 chars)
  fields.push(tlv('60', sanitize(city, 15)));

  // ID 62 - Additional Data Field
  const additionalFields: string[] = [];
  additionalFields.push(tlv('05', txId || '***')); // Reference Label
  fields.push(tlv('62', additionalFields.join('')));

  // ID 63 - CRC16 (computed over the entire payload including "6304")
  const payloadWithoutCrc = fields.join('') + '6304';
  const crc = computeCRC16(payloadWithoutCrc);
  fields.push(tlv('63', crc));

  return fields.join('');
}

/**
 * Check if a string is a plausible Pix key.
 */
export function isValidPixKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return detectPixKeyType(key) !== null;
}

/**
 * Detect the type of Pix key.
 */
export function detectPixKeyType(key: string): PixKeyType | null {
  const trimmed = key.trim();
  if (!trimmed) return null;

  // CPF: exactly 11 digits
  if (/^\d{11}$/.test(trimmed)) return 'cpf';

  // CNPJ: exactly 14 digits
  if (/^\d{14}$/.test(trimmed)) return 'cnpj';

  // Phone: starts with +55 followed by 10-11 digits
  if (/^\+55\d{10,11}$/.test(trimmed)) return 'phone';

  // Email: contains @
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';

  // Random key (EVP): UUID-like pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed))
    return 'random';

  return null;
}

// --- Internal helpers ---

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function sanitize(str: string, maxLen: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9 ]/g, '') // Keep only alphanumeric + spaces
    .substring(0, maxLen)
    .trim();
}

/**
 * CRC-16/CCITT-FALSE as required by EMV standard.
 */
function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
