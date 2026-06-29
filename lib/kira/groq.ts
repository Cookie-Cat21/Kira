import Groq from "groq-sdk";

// Read all keys: GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, …
let _keys: string[] | undefined;
export function getGroqKeys(): string[] {
  if (_keys) return _keys;
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (!k) break;
    keys.push(k);
  }
  _keys = keys.length > 0 ? keys : [""];
  return _keys;
}

/** True when at least one non-empty Groq key is configured. */
export function hasGroqKeys(): boolean {
  return getGroqKeys().some((k) => k.length > 0);
}

/** Spread load across keys — each request starts on the next slot (still 70B first). */
let _nextKeySlot = 0;
export function pickStartingKeyIndex(): number {
  const count = getGroqKeys().filter((k) => k.length > 0).length;
  if (count <= 1) return 0;
  const idx = _nextKeySlot % count;
  _nextKeySlot = (_nextKeySlot + 1) % count;
  return idx;
}

// One cached client per key to avoid re-creating TLS connections.
const _clients = new Map<string, Groq>();
export function getGroq(keyIndex = 0): Groq {
  const keys = getGroqKeys();
  const key = keys[keyIndex % keys.length] ?? "";
  if (!_clients.has(key)) _clients.set(key, new Groq({ apiKey: key }));
  return _clients.get(key)!;
}
