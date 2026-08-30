import { planEssaRequest } from "../src/core/index.js";

const cases = [
  {
    input: "создать цифровую личность",
    expected: {
      intent: "digital_identity",
      agent: "Digital Identity Agent",
      workflowId: "digital_identity_profile"
    }
  },
  {
    input: "аватар Лисы",
    expected: {
      intent: "digital_identity",
      agent: "Digital Identity Agent",
      workflowId: "digital_identity_profile"
    }
  },
  {
    input: "говорящий аватар",
    expected: {
      intent: "digital_identity",
      agent: "Digital Identity Agent",
      workflowId: "digital_identity_profile"
    }
  },
  {
    input: "поющий аватар",
    expected: {
      intent: "digital_identity",
      agent: "Digital Identity Agent",
      workflowId: "digital_identity_profile"
    }
  },
  {
    input: "создай ролик",
    expected: {
      intent: "production",
      agent: "Production Agent",
      workflowId: "production_video"
    }
  },
  {
    input: "размножить контент",
    expected: {
      intent: "production",
      agent: "Production Agent",
      workflowId: "content_multiplication_package"
    }
  },
  {
    input: "сделай сайт",
    expected: {
      intent: "website",
      agent: "Website Agent",
      workflowId: "website_project"
    }
  },
  {
    input: "нужна квартира в Батуми",
    expected: {
      intent: "property",
      agent: "Property Agent",
      workflowId: "property_request"
    }
  },
  {
    input: "создай рекламу",
    expected: {
      intent: "marketing",
      agent: "Marketing Agent",
      workflowId: "marketing_campaign"
    }
  },
  {
    input: "напиши договор",
    expected: {
      intent: "legal",
      agent: "Legal Agent",
      workflowId: "legal_preparation"
    }
  },
  {
    input: "хочу пройти путь ESSA",
    expected: {
      intent: "education",
      agent: "Education Agent",
      workflowId: "education_path"
    }
  }
];

let failures = 0;

for (const testCase of cases) {
  const result = planEssaRequest(testCase.input);
  const actual = {
    intent: result.intent,
    agent: result.agent,
    workflowId: result.workflow?.id || null
  };
  const passed = Object.entries(testCase.expected)
    .every(([key, value]) => actual[key] === value);

  if (!passed) {
    failures += 1;
  }

  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.input}`);
  console.log(JSON.stringify(actual, null, 2));
}

if (failures > 0) {
  console.error(`ESSA Core tests failed: ${failures}`);
  process.exit(1);
}

console.log("ESSA Core tests passed.");
