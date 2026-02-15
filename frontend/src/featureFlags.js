/**
 * Feature flags.
 *
 * ENABLE_VOICE_QA: Set to false to completely disable the Voice QA flow.
 * When disabled: no pinch gesture, no Voice QA panel, no mic usage.
 * (index+thumb = stop speech → record question → ElevenLabs transcribe → Gemini answer → ElevenLabs speak)
 */
export const ENABLE_VOICE_QA = true;
