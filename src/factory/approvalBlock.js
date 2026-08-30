const APPROVAL_BLOCK = `APPROVAL REQUIRED

Options:
- approve
- revise
- cancel
- continue manually

Внешние инструменты, публикация, платежи и необратимые действия не запускаются без подтверждения человека.
No external tools, publishing, payments, or irreversible actions are started without human approval.`;

export function approvalBlock() {
  return APPROVAL_BLOCK;
}

export function hasApprovalBlock(text) {
  return String(text || "").toLowerCase().includes("approval required");
}
