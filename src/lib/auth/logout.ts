'use client';

import { clearAllCache } from '@/lib/sync/db';

/**
 * Limpa todos os caches locais antes do logout.
 * Deve ser chamado ANTES de supabase.auth.signOut() para garantir
 * que dados sensíveis não permaneçam no dispositivo.
 *
 * Limpa: IndexedDB (Dexie), localStorage, Service Worker caches.
 */
export async function cleanupOnLogout(): Promise<void> {
  // 1. Limpar IndexedDB (viagens, despesas, notas, etc.)
  try {
    await clearAllCache();
  } catch {
    // Não bloquear logout por falha de limpeza
  }

  // 2. Limpar localStorage (templates de despesas, preferências PWA)
  try {
    localStorage.clear();
  } catch {
    // localStorage pode não estar disponível (SSR, iframe sandbox)
  }

  // 3. Limpar caches do Service Worker
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {
      // Cache API pode não estar disponível
    }
  }
}
