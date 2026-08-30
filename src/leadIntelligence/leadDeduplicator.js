import { dedupeStatuses } from "./leadContracts.js";

function keyParts(entity = {}) {
  return [
    entity.website,
    entity.publicBusinessEmail,
    entity.publicBusinessPhone,
    `${entity.legalOrDisplayName}|${entity.city}`.toLowerCase()
  ].filter(Boolean);
}

function intersects(a = [], b = []) {
  const right = new Set(b);
  return a.some((item) => right.has(item));
}

export function dedupeBusinessEntities(entities = []) {
  const canonical = [];
  const decisions = [];

  entities.forEach((entity) => {
    const existing = canonical.find((item) => intersects(keyParts(item), keyParts(entity)));
    if (!existing) {
      canonical.push(entity);
      decisions.push({ businessId: entity.businessId, status: dedupeStatuses.unique, duplicateOf: null, evidence: keyParts(entity) });
      return;
    }
    const confirmed = entity.website && existing.website && entity.website === existing.website;
    decisions.push({
      businessId: entity.businessId,
      status: confirmed ? dedupeStatuses.confirmedDuplicate : dedupeStatuses.possibleDuplicate,
      duplicateOf: existing.businessId,
      evidence: keyParts(entity).filter((part) => keyParts(existing).includes(part))
    });
  });

  return {
    canonicalEntities: canonical,
    decisions,
    duplicatesRemoved: decisions.filter((item) => item.status === dedupeStatuses.confirmedDuplicate).length,
    possibleDuplicateCount: decisions.filter((item) => item.status === dedupeStatuses.possibleDuplicate).length
  };
}
