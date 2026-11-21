// Every AI switch off, as a new store has them (the backend's AI_DEFAULTS), for the AI page's tests.
import { AI_FEATURE_KEYS, type AiSettings } from "../../api/ai.api";

export const AI_DEFAULTS_FOR_TESTS: AiSettings = { ...(Object.fromEntries(AI_FEATURE_KEYS.map((k) => [k, false])) as Record<(typeof AI_FEATURE_KEYS)[number], boolean>), dailyLimit: 500 };
