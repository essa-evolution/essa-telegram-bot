import {
  fixtureBuilding,
  fixtureDeveloper,
  fixtureFloor,
  fixtureLandParcel,
  fixtureProject,
  fixtureUnit,
  propertyFixtures
} from "./propertyFixtures.js";
import {
  clonePropertyReadValue,
  createPropertyNotFound,
  matchesPropertyFilters,
  propertyRepositoryContract
} from "./propertyRepository.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSources(sources = []) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = source?.sourceId || `${source?.sourceName}:${source?.observedAt}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chronologicalEvents(events = []) {
  return [...events].sort((a, b) => String(a.observedAt || a.createdAt || "").localeCompare(String(b.observedAt || b.createdAt || "")));
}

export function createLocalPropertyRepository(fixtures = propertyFixtures) {
  const properties = safeArray(fixtures.properties);
  const listings = safeArray(fixtures.listingSnapshots);
  const facts = safeArray(fixtures.facts);
  const lifecycleEvents = safeArray(fixtures.lifecycleEvents);
  const sourceRefs = safeArray(fixtures.sourceRefs);
  const projects = safeArray(fixtures.projects || [fixtureProject]);
  const buildings = safeArray(fixtures.buildings || [fixtureBuilding]);
  const floors = safeArray(fixtures.floors || [fixtureFloor]);
  const units = safeArray(fixtures.units || [fixtureUnit]);
  const developers = safeArray(fixtures.developers || [fixtureDeveloper]);
  const landParcels = safeArray(fixtures.landParcels || [fixtureLandParcel]);

  function getProperty(propertyId) {
    return properties.find((property) => property.propertyId === propertyId) || null;
  }

  const repository = {
    contract: propertyRepositoryContract,
    readOnly: true,

    getPropertyById(propertyId) {
      const property = getProperty(propertyId);
      if (!property) return createPropertyNotFound(propertyId);
      return {
        ok: true,
        status: "FOUND",
        propertyId,
        property: clonePropertyReadValue(property),
        providerCalls: 0,
        externalCalls: 0,
        dbMutations: 0,
        payments: 0
      };
    },

    listProperties(filters = {}) {
      return {
        ok: true,
        status: "FOUND",
        filters: clonePropertyReadValue(filters),
        properties: properties
          .filter((property) => matchesPropertyFilters(property, filters))
          .map(clonePropertyReadValue),
        providerCalls: 0,
        externalCalls: 0,
        dbMutations: 0,
        payments: 0
      };
    },

    getListingsForProperty(propertyId) {
      return clonePropertyReadValue(listings.filter((listing) => listing.propertyId === propertyId));
    },

    getFactsForProperty(propertyId) {
      const property = getProperty(propertyId);
      return clonePropertyReadValue([
        ...facts.filter((fact) => property?.facts?.some((propertyFact) => propertyFact.factType === fact.factType)),
        ...safeArray(property?.facts).filter((fact) => !facts.some((fixtureFact) => fixtureFact.factType === fact.factType))
      ]);
    },

    getSourcesForProperty(propertyId) {
      const property = getProperty(propertyId);
      const propertyFacts = this.getFactsForProperty(propertyId);
      const propertyListings = this.getListingsForProperty(propertyId);
      const propertyEvents = this.getLifecycleEvents(propertyId);
      return clonePropertyReadValue(uniqueSources([
        ...safeArray(property?.sourceRefs),
        ...sourceRefs.filter((source) => safeArray(property?.sourceRefs).some((propertySource) => propertySource.sourceId === source.sourceId)),
        ...propertyFacts.map((fact) => fact.sourceRef).filter(Boolean),
        ...propertyListings.map((listing) => listing.sourceRef).filter(Boolean),
        ...propertyEvents.map((event) => event.sourceRef).filter(Boolean)
      ]));
    },

    getLifecycleEvents(propertyId) {
      return clonePropertyReadValue(chronologicalEvents(lifecycleEvents.filter((event) => event.propertyId === propertyId)));
    },

    getHierarchyForProperty(propertyId) {
      const property = getProperty(propertyId);
      if (!property) {
        return {
          project: null,
          building: null,
          floor: null,
          unit: null,
          developer: null,
          landParcel: null
        };
      }
      const project = projects.find((item) => item.projectId === property.projectId) || null;
      const building = buildings.find((item) => item.buildingId === property.buildingId) || null;
      const unit = units.find((item) => item.unitId === property.unitId || item.propertyId === propertyId) || null;
      const floor = floors.find((item) => item.floorId === unit?.floorId) || null;
      const developer = developers.find((item) => item.developerId === project?.developerId) || null;
      const landParcel = landParcels.find((item) => item.projectId === property.projectId) || null;
      return clonePropertyReadValue({ project, building, floor, unit, developer, landParcel });
    },

    getPropertyEvidence(propertyId) {
      const propertyResult = this.getPropertyById(propertyId);
      if (!propertyResult.ok) return propertyResult;
      const hierarchy = this.getHierarchyForProperty(propertyId);
      return {
        ok: true,
        status: "FOUND",
        propertyId,
        property: propertyResult.property,
        facts: this.getFactsForProperty(propertyId),
        listingSnapshots: this.getListingsForProperty(propertyId),
        lifecycleEvents: this.getLifecycleEvents(propertyId),
        sourceRefs: this.getSourcesForProperty(propertyId),
        project: hierarchy.project,
        building: hierarchy.building,
        floor: hierarchy.floor,
        unit: hierarchy.unit,
        developer: hierarchy.developer,
        landParcel: hierarchy.landParcel,
        accessScopeReady: true,
        readScope: "PUBLIC",
        providerCalls: 0,
        externalCalls: 0,
        dbMutations: 0,
        payments: 0
      };
    }
  };

  return repository;
}

export const localPropertyRepository = createLocalPropertyRepository();
