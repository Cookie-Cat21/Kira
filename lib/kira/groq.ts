import Groq from "groq-sdk";

// Read all keys: GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, …
// Falls back to a single empty string so callers always get an array.
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

// One cached client per key to avoid re-creating TLS connections.
const _clients = new Map<string, Groq>();
export function getGroq(keyIndex = 0): Groq {
  const keys = getGroqKeys();
  const key = keys[keyIndex % keys.length] ?? "";
  if (!_clients.has(key)) _clients.set(key, new Groq({ apiKey: key }));
  return _clients.get(key)!;
}
