process.env.PHASE20_TARGET_URL = "http://localhost:3000/workspace/#product-discovery";
process.env.PHASE_ID = "21F";
process.env.ARTIFACT_DIR = "artifacts/productDiscovery/phase21f";
process.env.SCREENSHOT_SUFFIX = "_product_discovery";

await import("./runMultiViewportUiAudit.js");
