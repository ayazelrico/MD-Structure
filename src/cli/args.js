/**
 * Zero-dependency CLI argument parser with strict flag handling.
 */

const BOOLEAN_FLAGS = new Set([
  "json",
  "dry-run",
  "force",
  "strict",
  "help",
  "version",
  "h",
  "v",
  "show-excluded",
]);

/**
 * Parse raw argv array (excluding `node` and script path).
 * @param {string[]} argv
 * @returns {{ command: string | null, positionals: string[], flags: Record<string, string | boolean> }}
 */
export function parseCliArgs(argv) {
  const positionals = [];
  /** @type {Record<string, string | boolean>} */
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const eqIdx = token.indexOf("=");
      if (eqIdx !== -1) {
        const key = token.slice(2, eqIdx);
        const val = token.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = token.slice(2);
        if (BOOLEAN_FLAGS.has(key)) {
          flags[key] = true;
        } else {
          const next = argv[i + 1];
          if (next === undefined || next.startsWith("--")) {
            flags[key] = true;
          } else {
            flags[key] = next;
            i++;
          }
        }
      }
      continue;
    }

    if (token.startsWith("-") && token.length === 2) {
      const key = token.slice(1);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = true;
      } else {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("-")) {
          flags[key] = true;
        } else {
          flags[key] = next;
          i++;
        }
      }
      continue;
    }

    positionals.push(token);
  }

  const command = positionals.length > 0 ? positionals[0] : null;
  return {
    command,
    positionals: positionals.slice(1),
    flags,
  };
}

/**
 * Split a comma-separated flag value into trimmed non-empty strings.
 * @param {string | boolean | undefined} value
 * @returns {string[]}
 */
export function parseCsvFlag(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
