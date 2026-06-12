const { searchEssaKnowledge } = require("./searchEssaKnowledge");
const { buildKnowledgeContext } = require("./promptInjection");

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    throw new Error('Usage: npm run search -- "your question"');
  }

  const chunks = await searchEssaKnowledge(query);
  console.log(buildKnowledgeContext(chunks));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
