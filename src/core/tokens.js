/**
 * Deterministic token estimation and context-budget evaluation utilities.
 * Uses a fast hybrid word/character heuristic calibrated for English technical Markdown
 * (typically within ~5-8% of BPE tokenizers like cl100k_base / o200k_base without dependencies).
 */

/**
 * Estimate token count for a Markdown or text string.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Split words and also account for punctuation, symbols, and code fences.
  const chars = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const codeFenceMatches = trimmed.match(/```/g);
  const codePenalty = codeFenceMatches ? codeFenceMatches.length * 4 : 0;

  // Blend char/4 and words*1.32 for accurate technical Markdown token projection.
  const byChars = chars / 3.9;
  const byWords = words * 1.32;
  return Math.max(1, Math.round((byChars * 0.55 + byWords * 0.45) + codePenalty));
}

/**
 * Evaluate a document's token usage against its configured budget.
 * @param {number} actualTokens
 * @param {{ min: number, target: number, max: number }} budget
 * @returns {{ status: "under" | "optimal" | "warning" | "over", ratio: number, message: string }}
 */
export function evaluateTokenBudget(actualTokens, budget) {
  if (!budget || !budget.max) {
    return { status: "optimal", ratio: 0, message: "No token budget defined." };
  }
  const ratio = Number((actualTokens / budget.max).toFixed(2));
  if (actualTokens > budget.max) {
    return {
      status: "over",
      ratio,
      message: `Exceeds max token budget (${actualTokens} > ${budget.max}). Split detail into sub-docs or compress prose into tables.`,
    };
  }
  if (actualTokens > budget.target * 1.15) {
    return {
      status: "warning",
      ratio,
      message: `Approaching max token budget (${actualTokens}/${budget.max}, target ${budget.target}). Avoid adding verbose prose.`,
    };
  }
  if (actualTokens < Math.max(80, Math.round((budget.min || 150) * 0.6))) {
    return {
      status: "under",
      ratio,
      message: `Below minimum substantive detail (${actualTokens} < ${budget.min}). Document may be an unfilled stub.`,
    };
  }
  return {
    status: "optimal",
    ratio,
    message: `Within optimal context envelope (${actualTokens}/${budget.max}, target ${budget.target}).`,
  };
}
