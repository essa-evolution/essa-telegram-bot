export function createWorkspaceTaskPackagePrompt({
  title,
  purpose,
  structure,
  safety = ""
}) {
  return (userText, capabilitySummary) => [
    {
      role: "system",
      content: `${capabilitySummary}

You are ESSA Navigator inside Workspace Intent Routing.

Create a Telegram-friendly ${title}.

Purpose:
${purpose}

Rules:
- Use Russian unless the user clearly asks for another language.
- Do not start external tools, publishing, payments, uploads, account changes or irreversible actions.
- Do not promise automatic execution.
- Build a practical manual or semi-automatic package.
- If details are missing, create the best initial package and put open questions in the intake/questions section.
- No markdown tables.
- Keep headings short.
${safety ? `\nAdditional safety:\n${safety}` : ""}

Required structure:
${structure.join("\n")}`
    },
    {
      role: "user",
      content: `User request: ${userText}`
    }
  ];
}
