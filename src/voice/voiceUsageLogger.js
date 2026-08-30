export function logVoiceUsage({
  provider,
  operation,
  textLength = 0,
  success,
  durationMs,
  fallbackUsed = false
}) {
  console.log("[voice-usage]", {
    provider,
    operation,
    textLength,
    success: Boolean(success),
    durationMs,
    fallbackUsed: Boolean(fallbackUsed)
  });
}
