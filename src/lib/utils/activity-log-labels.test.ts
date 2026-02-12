import { describe, it, expect } from 'vitest';
import { getLogMessage, getLogIcon } from './activity-log-labels';

describe('getLogMessage', () => {
  it('should format expense created message', () => {
    const msg = getLogMessage('created', 'expense', { description: 'Almoço' });
    expect(msg).toBe('adicionou despesa: "Almoço"');
  });

  it('should format activity deleted message', () => {
    const msg = getLogMessage('deleted', 'activity', { title: 'Tour guiado' });
    expect(msg).toBe('removeu atividade: "Tour guiado"');
  });

  it('should format settlement marked_paid without detail', () => {
    const msg = getLogMessage('marked_paid', 'settlement', {});
    expect(msg).toBe('marcou como pago acerto');
  });

  it('should format checklist completed message', () => {
    const msg = getLogMessage('completed', 'checklist_item', { title: 'Passaporte' });
    expect(msg).toBe('completou item de checklist: "Passaporte"');
  });

  it('should handle unknown action/entity gracefully', () => {
    const msg = getLogMessage('unknown_action', 'unknown_entity', {});
    expect(msg).toBe('unknown_action unknown_entity');
  });

  it('should use name field from metadata', () => {
    const msg = getLogMessage('created', 'checklist', { name: 'Roupas' });
    expect(msg).toBe('adicionou checklist: "Roupas"');
  });

  it('should format note updated message with description', () => {
    const msg = getLogMessage('updated', 'note', { description: 'Lista de compras' });
    expect(msg).toBe('editou nota: "Lista de compras"');
  });
});

describe('getLogIcon', () => {
  it('should return correct icon names', () => {
    expect(getLogIcon('expense')).toBe('DollarSign');
    expect(getLogIcon('activity')).toBe('MapPin');
    expect(getLogIcon('note')).toBe('StickyNote');
    expect(getLogIcon('settlement')).toBe('ArrowLeftRight');
  });

  it('should return fallback for unknown entity', () => {
    expect(getLogIcon('unknown')).toBe('Activity');
  });
});
