-- Half Trip - Seed Data for Development
-- This file provides sample data for local development and testing
-- Run with: supabase db reset (which applies migrations + seed)

-- ============================================================================
-- NOTE: This seed file assumes you have test users created via Supabase Auth
-- For local development, create these test users via the Supabase dashboard
-- or use the auth.admin API:
--
-- Test Users (create manually or via auth):
-- 1. alice@example.com (password: password123) - Will be organizer
-- 2. bob@example.com (password: password123) - Will be participant
-- 3. carol@example.com (password: password123) - Will be participant
-- ============================================================================

-- For seed data to work, we need to insert users directly
-- In production, users are created via auth signup trigger
-- For development, we'll use fixed UUIDs

-- Fixed UUIDs for test users
DO $$
DECLARE
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  carol_id UUID := '33333333-3333-3333-3333-333333333333';
  trip1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  trip2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  expense1_id UUID := 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee';
  expense2_id UUID := 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee';
  expense3_id UUID := 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee';
  expense4_id UUID := 'eeeeeeee-0004-0004-0004-eeeeeeeeeeee';
  activity1_id UUID := 'dddddddd-0001-0001-0001-dddddddddddd';
  activity2_id UUID := 'dddddddd-0002-0002-0002-dddddddddddd';
  activity3_id UUID := 'dddddddd-0003-0003-0003-dddddddddddd';
  activity4_id UUID := 'dddddddd-0004-0004-0004-dddddddddddd';
  activity5_id UUID := 'dddddddd-0005-0005-0005-dddddddddddd';
BEGIN
  -- ============================================================================
  -- INSERT TEST USERS
  -- ============================================================================
  INSERT INTO users (id, email, name, avatar_url, created_at) VALUES
    (alice_id, 'alice@example.com', 'Alice Santos', NULL, NOW() - INTERVAL '30 days'),
    (bob_id, 'bob@example.com', 'Bob Silva', NULL, NOW() - INTERVAL '25 days'),
    (carol_id, 'carol@example.com', 'Carol Oliveira', NULL, NOW() - INTERVAL '20 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- INSERT TRIPS
  -- ============================================================================
  INSERT INTO trips (id, name, destination, start_date, end_date, description, style, created_by, created_at) VALUES
    (
      trip1_id,
      'Fim de Semana em Paraty',
      'Paraty, RJ',
      CURRENT_DATE + INTERVAL '14 days',
      CURRENT_DATE + INTERVAL '16 days',
      'Um final de semana relaxante no centro histórico de Paraty. Vamos aproveitar as praias, a comida e as ruas de pedra!',
      'relaxation',
      alice_id,
      NOW() - INTERVAL '10 days'
    ),
    (
      trip2_id,
      'Aventura em Bonito',
      'Bonito, MS',
      CURRENT_DATE + INTERVAL '45 days',
      CURRENT_DATE + INTERVAL '52 days',
      'Uma semana de ecoturismo em Bonito! Flutuação, cachoeiras e muita natureza.',
      'adventure',
      alice_id,
      NOW() - INTERVAL '5 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- INSERT TRIP MEMBERS
  -- ============================================================================
  INSERT INTO trip_members (trip_id, user_id, role, joined_at, invited_by) VALUES
    -- Trip 1: Paraty
    (trip1_id, alice_id, 'organizer', NOW() - INTERVAL '10 days', NULL),
    (trip1_id, bob_id, 'participant', NOW() - INTERVAL '8 days', alice_id),
    (trip1_id, carol_id, 'participant', NOW() - INTERVAL '7 days', alice_id),
    -- Trip 2: Bonito (only Alice and Bob so far)
    (trip2_id, alice_id, 'organizer', NOW() - INTERVAL '5 days', NULL),
    (trip2_id, bob_id, 'participant', NOW() - INTERVAL '3 days', alice_id)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- ============================================================================
  -- INSERT ACTIVITIES (Trip 1: Paraty)
  -- ============================================================================
  INSERT INTO activities (id, trip_id, title, date, start_time, duration_minutes, location, description, category, sort_order, created_by, created_at) VALUES
    (
      activity1_id,
      trip1_id,
      'Saída de São Paulo',
      CURRENT_DATE + INTERVAL '14 days',
      '06:00',
      300,
      'São Paulo',
      'Saída cedo para evitar trânsito. Encontro no posto Shell da Marginal.',
      'transport',
      1,
      alice_id,
      NOW() - INTERVAL '9 days'
    ),
    (
      activity2_id,
      trip1_id,
      'Check-in Pousada',
      CURRENT_DATE + INTERVAL '14 days',
      '12:00',
      30,
      'Pousada do Centro Histórico, Paraty',
      'Check-in na pousada e acomodação nos quartos.',
      'accommodation',
      2,
      alice_id,
      NOW() - INTERVAL '9 days'
    ),
    (
      activity3_id,
      trip1_id,
      'Almoço no Banana da Terra',
      CURRENT_DATE + INTERVAL '14 days',
      '13:00',
      90,
      'Restaurante Banana da Terra, Paraty',
      'Comida brasileira contemporânea. Reserva já feita para 3 pessoas.',
      'meal',
      3,
      bob_id,
      NOW() - INTERVAL '8 days'
    ),
    (
      activity4_id,
      trip1_id,
      'Passeio de Escuna',
      CURRENT_DATE + INTERVAL '15 days',
      '10:00',
      240,
      'Cais de Paraty',
      'Passeio de escuna pelas ilhas da baía. Inclui paradas para banho.',
      'tour',
      1,
      carol_id,
      NOW() - INTERVAL '7 days'
    ),
    (
      activity5_id,
      trip1_id,
      'Volta para São Paulo',
      CURRENT_DATE + INTERVAL '16 days',
      '14:00',
      300,
      'Paraty',
      'Saída após o almoço para voltar com calma.',
      'transport',
      1,
      alice_id,
      NOW() - INTERVAL '9 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- INSERT EXPENSES (Trip 1: Paraty)
  -- ============================================================================
  INSERT INTO expenses (id, trip_id, description, amount, currency, date, category, paid_by, created_by, notes, created_at) VALUES
    (
      expense1_id,
      trip1_id,
      'Reserva Pousada (3 diárias)',
      1200.00,
      'BRL',
      CURRENT_DATE - INTERVAL '5 days',
      'accommodation',
      alice_id,
      alice_id,
      'Pago com cartão. Inclui café da manhã.',
      NOW() - INTERVAL '5 days'
    ),
    (
      expense2_id,
      trip1_id,
      'Gasolina ida',
      250.00,
      'BRL',
      CURRENT_DATE + INTERVAL '14 days',
      'transport',
      bob_id,
      bob_id,
      'Estimativa para ida. Vou atualizar com valor real.',
      NOW() - INTERVAL '4 days'
    ),
    (
      expense3_id,
      trip1_id,
      'Almoço Banana da Terra',
      320.00,
      'BRL',
      CURRENT_DATE + INTERVAL '14 days',
      'food',
      carol_id,
      carol_id,
      NULL,
      NOW() - INTERVAL '3 days'
    ),
    (
      expense4_id,
      trip1_id,
      'Passeio de Escuna (3 pessoas)',
      450.00,
      'BRL',
      CURRENT_DATE + INTERVAL '15 days',
      'tickets',
      alice_id,
      alice_id,
      'R$150 por pessoa',
      NOW() - INTERVAL '2 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- INSERT EXPENSE SPLITS
  -- ============================================================================
  -- Split 1: Pousada - dividido igualmente (R$400 cada)
  INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
    (expense1_id, alice_id, 400.00, 33.33),
    (expense1_id, bob_id, 400.00, 33.33),
    (expense1_id, carol_id, 400.00, 33.34)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  -- Split 2: Gasolina - dividido igualmente (R$83.33 cada)
  INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
    (expense2_id, alice_id, 83.33, 33.33),
    (expense2_id, bob_id, 83.33, 33.33),
    (expense2_id, carol_id, 83.34, 33.34)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  -- Split 3: Almoço - dividido igualmente (R$106.67 cada)
  INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
    (expense3_id, alice_id, 106.67, 33.33),
    (expense3_id, bob_id, 106.67, 33.33),
    (expense3_id, carol_id, 106.66, 33.34)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  -- Split 4: Escuna - dividido igualmente (R$150 cada)
  INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
    (expense4_id, alice_id, 150.00, 33.33),
    (expense4_id, bob_id, 150.00, 33.33),
    (expense4_id, carol_id, 150.00, 33.34)
  ON CONFLICT (expense_id, user_id) DO NOTHING;

  -- ============================================================================
  -- INSERT TRIP NOTES
  -- ============================================================================
  INSERT INTO trip_notes (trip_id, content, created_by, created_at) VALUES
    (
      trip1_id,
      'Lembrar de levar protetor solar e repelente!',
      alice_id,
      NOW() - INTERVAL '6 days'
    ),
    (
      trip1_id,
      'Paraty tem muitos mosquitos no fim da tarde. Bom ter calça comprida.',
      bob_id,
      NOW() - INTERVAL '4 days'
    ),
    (
      trip2_id,
      'Verificar se precisamos de certificado de vacinação de febre amarela.',
      alice_id,
      NOW() - INTERVAL '3 days'
    )
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- INSERT TRIP INVITES (one pending invite for Trip 2)
  -- ============================================================================
  INSERT INTO trip_invites (trip_id, code, email, invited_by, expires_at, created_at) VALUES
    (
      trip2_id,
      'BONITO2024',
      'carol@example.com',
      alice_id,
      NOW() + INTERVAL '7 days',
      NOW() - INTERVAL '1 day'
    )
  ON CONFLICT (code) DO NOTHING;

END $$;

-- ============================================================================
-- SUMMARY OF SEED DATA
-- ============================================================================
--
-- Users (3):
--   - Alice Santos (organizer of both trips)
--   - Bob Silva (participant in both trips)
--   - Carol Oliveira (participant in Trip 1, pending invite for Trip 2)
--
-- Trips (2):
--   - "Fim de Semana em Paraty" - 3 days, relaxation style
--   - "Aventura em Bonito" - 7 days, adventure style
--
-- Trip 1 (Paraty):
--   - 5 activities across 3 days
--   - 4 expenses totaling R$2,220
--   - All expenses split equally among 3 participants
--   - 2 trip notes
--
-- Trip 2 (Bonito):
--   - No activities yet
--   - No expenses yet
--   - 1 trip note
--   - 1 pending invite for Carol
--
-- Balance Summary (Trip 1):
--   - Total expenses: R$2,220.00
--   - Per person share: R$740.00
--   - Alice paid: R$1,650.00 (owes: R$740.00) → receives R$910.00
--   - Bob paid: R$250.00 (owes: R$740.00) → pays R$490.00
--   - Carol paid: R$320.00 (owes: R$740.00) → pays R$420.00
--
-- ============================================================================
