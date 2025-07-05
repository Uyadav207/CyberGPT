import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import React from "react";

interface ReasoningCollapsibleProps {
  reasoning: string;
  loading: boolean;
  title?: string;
}

const ReasoningCollapsible: React.FC<ReasoningCollapsibleProps> = ({ reasoning, loading, title }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-primary">{title || "Reasoning"}</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle Reasoning">
            <ChevronDown className={`transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="bg-muted rounded p-3 text-sm min-h-[40px]">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" /> Streaming reasoning...</span>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{reasoning}</span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ReasoningCollapsible; 