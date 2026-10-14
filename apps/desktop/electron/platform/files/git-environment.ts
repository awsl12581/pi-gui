/**
 * Deletion overlay for app-owned Git commands. Platform inherits process.env,
 * so omitting GIT_* keys would let repository and index overrides leak back in.
 */
export function isolatedGitEnvironment(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  const identity = (key: string) => (process.platform === "win32" ? key.toUpperCase() : key);
  for (const key of Object.keys(process.env)) {
    const normalized = identity(key);
    if (normalized.startsWith("GIT_")) env[normalized] = undefined;
  }
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  // Trusted store-specific overrides replace deletion entries, including on Windows.
  for (const [key, value] of Object.entries(extra)) env[identity(key)] = value;
  return env;
}
