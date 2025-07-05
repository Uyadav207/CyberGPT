import React from "react";
import { ExternalLink } from "lucide-react";

/**
 * SourceCard
 *
 * Props:
 * - label: string - The source title.
 * - url?: string - The source URL (if present, title is clickable).
 * - description?: string - Optional description/summary.
 * - favicon?: string - Optional favicon/logo URL.
 */
export interface SourceCardProps {
  label: string;
  url?: string;
  description?: string;
  favicon?: string;
}

const SourceCard: React.FC<SourceCardProps> = ({ label, url, description, favicon }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition group">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
      {favicon ? (
        <img src={favicon} alt="" className="w-8 h-8 object-contain" />
      ) : (
        <span className="text-xl">🌐</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary text-base hover:underline flex items-center gap-1"
        >
          {label}
          <ExternalLink className="w-4 h-4 inline-block opacity-60 group-hover:opacity-100" />
        </a>
      ) : (
        <div className="font-semibold text-base text-foreground">{label}</div>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-muted-foreground truncate hover:underline"
        >
          {url}
        </a>
      )}
      {description && (
        <div className="text-sm text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  </div>
);

export default SourceCard; 