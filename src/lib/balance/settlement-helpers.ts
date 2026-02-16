import type { EntitySettlement } from './types';

/**
 * Split an entity-level settlement into individual participant settlements
 * for database persistence.
 *
 * When a group settles with another group or individual, the amount is
 * divided equally among the "from" group members, each paying their share
 * to each "to" member (or individual).
 */
export function splitEntitySettlement(
  entitySettlement: EntitySettlement
): Array<{ fromParticipantId: string; toParticipantId: string; amount: number }> {
  const fromIds =
    entitySettlement.from.entityType === 'group' && entitySettlement.from.members
      ? entitySettlement.from.members.map((m) => m.participantId)
      : [entitySettlement.from.entityId];

  const toIds =
    entitySettlement.to.entityType === 'group' && entitySettlement.to.members
      ? entitySettlement.to.members.map((m) => m.participantId)
      : [entitySettlement.to.entityId];

  const totalCombinations = fromIds.length * toIds.length;
  const amountPerSettlement = entitySettlement.amount / totalCombinations;

  const results: Array<{
    fromParticipantId: string;
    toParticipantId: string;
    amount: number;
  }> = [];

  for (const fromId of fromIds) {
    for (const toId of toIds) {
      results.push({
        fromParticipantId: fromId,
        toParticipantId: toId,
        amount: Math.round(amountPerSettlement * 100) / 100,
      });
    }
  }

  return results;
}
