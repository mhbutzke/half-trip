import { z } from 'zod';

// Invite code format: 8 alphanumeric characters
export const inviteCodeSchema = z
  .string()
  .min(8, 'Código de convite inválido')
  .max(8, 'Código de convite inválido')
  .regex(/^[A-Za-z0-9]+$/, 'Código de convite inválido');

// Schema for creating an invite link
export const createInviteLinkSchema = z.object({
  tripId: z.string().uuid('ID da viagem inválido'),
  expirationDays: z.number().int().min(1).max(30).optional().default(7),
});

// Schema for email invite (future use)
export const emailInviteSchema = z.object({
  tripId: z.string().uuid('ID da viagem inválido'),
  email: z.string().email('Email inválido'),
});

export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>;
export type EmailInviteInput = z.infer<typeof emailInviteSchema>;
