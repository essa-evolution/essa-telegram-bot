import { sourceTrustTiers } from "./technologyContracts.js";

export const technologySourceCategories = {
  officialProviderReleases: "OFFICIAL_PROVIDER_RELEASES",
  officialDocumentation: "OFFICIAL_DOCUMENTATION",
  officialChangelogs: "OFFICIAL_CHANGELOGS",
  githubReleases: "GITHUB_RELEASES",
  githubTrendingOrSearch: "GITHUB_TRENDING_OR_SEARCH",
  huggingFaceModels: "HUGGINGFACE_MODELS",
  openRouterModels: "OPENROUTER_MODELS",
  npmPackages: "NPM_PACKAGES",
  pypiPackages: "PYPI_PACKAGES",
  arxivOrResearch: "ARXIV_OR_RESEARCH",
  reputableTechNews: "REPUTABLE_TECH_NEWS",
  communitySignal: "COMMUNITY_SIGNAL",
  socialSignal: "SOCIAL_SIGNAL"
};

export const technologySourceRegistry = [
  { sourceId: "official_provider_releases", category: technologySourceCategories.officialProviderReleases, trustTier: sourceTrustTiers.tier1Official },
  { sourceId: "official_documentation", category: technologySourceCategories.officialDocumentation, trustTier: sourceTrustTiers.tier1Official },
  { sourceId: "official_changelogs", category: technologySourceCategories.officialChangelogs, trustTier: sourceTrustTiers.tier1Official },
  { sourceId: "github_releases", category: technologySourceCategories.githubReleases, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "github_trending_or_search", category: technologySourceCategories.githubTrendingOrSearch, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "huggingface_models", category: technologySourceCategories.huggingFaceModels, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "openrouter_models", category: technologySourceCategories.openRouterModels, trustTier: sourceTrustTiers.tier1Official },
  { sourceId: "npm_packages", category: technologySourceCategories.npmPackages, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "pypi_packages", category: technologySourceCategories.pypiPackages, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "arxiv_or_research", category: technologySourceCategories.arxivOrResearch, trustTier: sourceTrustTiers.tier2IndependentTechnical },
  { sourceId: "reputable_tech_news", category: technologySourceCategories.reputableTechNews, trustTier: sourceTrustTiers.tier2IndependentTechnical },
  { sourceId: "community_signal", category: technologySourceCategories.communitySignal, trustTier: sourceTrustTiers.tier3RepositoryCommunity },
  { sourceId: "social_signal", category: technologySourceCategories.socialSignal, trustTier: sourceTrustTiers.tier4SocialSignal }
];

export function getTechnologySource(sourceId, registry = technologySourceRegistry) {
  return registry.find((source) => source.sourceId === sourceId) || null;
}

export function tierRank(tier) {
  return {
    [sourceTrustTiers.tier1Official]: 1,
    [sourceTrustTiers.tier2IndependentTechnical]: 2,
    [sourceTrustTiers.tier3RepositoryCommunity]: 3,
    [sourceTrustTiers.tier4SocialSignal]: 4
  }[tier] || 99;
}

