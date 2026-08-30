import { detectFactoryIntent } from "../src/factory/detectFactoryIntent.js";

const cases = [
  ["создай ролик", "content_factory"],
  ["сделай shorts про ESSA", "content_factory"],
  ["сделай рилс", "content_factory"],
  ["подготовь контент для Telegram", "content_factory"],
  ["создай видео про Лису", "content_factory"],
  ["сделай проект дома", "project_factory"],
  ["хочу дом с нуля", "project_factory"],
  ["собери проектный пакет", "project_factory"],
  ["привет", "none"],
  ["как дела", "none"]
];

let failed = 0;

for (const [input, expected] of cases) {
  const actual = detectFactoryIntent(input);
  const ok = actual === expected;
  console.log(`${ok ? "OK" : "FAIL"} | ${input} -> ${actual}`);

  if (!ok) {
    failed += 1;
    console.log(`  expected: ${expected}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
