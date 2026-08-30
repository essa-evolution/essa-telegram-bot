const agentsByIntent = {
  digital_identity: "Digital Identity Agent",
  production: "Production Agent",
  website: "Website Agent",
  property: "Property Agent",
  marketing: "Marketing Agent",
  legal: "Legal Agent",
  travel: "Travel Agent",
  education: "Education Agent",
  psychology: "Psychology Agent",
  product_essa: "ESSA Products Agent",
  unknown: "Navigator Agent"
};

export function selectAgent(intent) {
  return agentsByIntent[intent] || agentsByIntent.unknown;
}

export function listAgents() {
  return { ...agentsByIntent };
}
