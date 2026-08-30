import fs from "fs";
import path from "path";

export const lisaCharacterCoreSource = {
  id: "lisa_character_core",
  title: "Lisa Character Core",
  category: "lisa_character_core",
  status: "source_of_truth",
  priority: "critical",
  path: "02_AGENTS/07_LISA/00_CORE/LISA_CHARACTER_CORE.md"
};

export function getLisaCharacterCoreSourcePath(cwd = process.cwd()) {
  return path.join(cwd, lisaCharacterCoreSource.path);
}

export function loadLisaCharacterCore({ includeContent = false, cwd = process.cwd() } = {}) {
  const sourcePath = getLisaCharacterCoreSourcePath(cwd);

  return {
    ...lisaCharacterCoreSource,
    sourcePath,
    stableCore: true,
    dynamicExpressionRequired: true,
    providerIndependent: true,
    content: includeContent ? fs.readFileSync(sourcePath, "utf8") : undefined
  };
}
