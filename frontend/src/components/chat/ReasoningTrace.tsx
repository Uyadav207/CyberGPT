/**
 * Plain-text reasoning only: no nested UI, one style. Used inside the purple panel.
 */

export interface ReasoningMeta {
  sourcesUsed?: string[];
  cveIdsInContext?: string[];
  enrichmentPerformed?: boolean;
  agentPersonality?: string;
}

function normalize(
  trace: Array<Record<string, unknown>> | undefined | null
): { summary: string; lines: string[] } {
  if (!trace || !Array.isArray(trace) || trace.length === 0) {
    return { summary: "", lines: [] };
  }
  const lines: string[] = [];
  let summary = "";
  for (const item of trace) {
    if (!item) continue;
    const n = item["narrative"];
    if (typeof n === "string" && n.trim()) {
      summary = n.trim();
      continue;
    }
    const step = item["step"];
    const msg = item["message"];
    if (step != null && msg != null) {
      lines.push(`${String(step)}: ${String(msg)}`);
    }
  }
  return { summary, lines };
}

/**
 * Single string for display—plain English only.
 * If the API sends only a narrative summary, show that alone (no duplicate Sources/Mode lines).
 * If legacy step-by-step trace exists, show those lines only.
 */
export function formatReasoningPlainText(
  trace: Array<Record<string, unknown>> | undefined | null,
  reasoningMeta?: ReasoningMeta | null,
  durationSec?: number
): string {
  const { summary, lines } = normalize(trace ?? null);

  // New API: one narrative only — show it alone, optional time suffix
  if (summary && lines.length === 0) {
    if (durationSec !== undefined) {
      return `${summary}\n\n(${durationSec.toFixed(1)}s)`;
    }
    return summary;
  }

  // Legacy: step list still present — show as plain lines
  if (lines.length > 0) {
    const head: string[] = [];
    if (durationSec !== undefined) head.push(`Generated in ${durationSec.toFixed(1)}s.`);
    if (summary) head.push(summary);
    return [...head, ...lines].filter(Boolean).join("\n\n");
  }

  if (summary) return summary;
  return "No reasoning summary available.";
}

interface ReasoningTraceProps {
  trace: Array<Record<string, unknown>> | undefined | null;
  reasoningMeta?: ReasoningMeta | null;
  durationSec?: number;
  className?: string;
}

/** Renders as a single text block—inherits parent color (e.g. purple panel) */
export function ReasoningTrace({
  trace,
  reasoningMeta,
  durationSec,
  className,
}: ReasoningTraceProps) {
  const text = formatReasoningPlainText(trace, reasoningMeta, durationSec);
  return (
    <div className={className ?? ""} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
      {text}
    </div>
  );
}
