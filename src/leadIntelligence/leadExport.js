const allowedExportFields = [
  "businessId",
  "legalOrDisplayName",
  "businessType",
  "industry",
  "subIndustry",
  "country",
  "region",
  "city",
  "website",
  "publicBusinessEmail",
  "publicBusinessPhone",
  "publicDescription",
  "verificationStatus",
  "dataFreshness"
];

export function createLeadExportPreview(entities = [], format = "JSON") {
  return {
    format,
    allowedFields: [...allowedExportFields],
    records: entities.map((entity) =>
      Object.fromEntries(allowedExportFields.map((field) => [field, entity[field] ?? null]))
    ),
    exportPerformed: false,
    crmMutationPerformed: false,
    personalFieldsExcluded: true
  };
}
