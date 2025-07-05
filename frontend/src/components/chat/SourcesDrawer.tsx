import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "../ui/sheet";
import { ExternalLink } from "lucide-react";
import SourceCard from "./SourceCard";

interface SourceItem {
  label: string;
  url?: string;
}

/**
 * SourcesDrawer
 *
 * Props:
 * - open: boolean - Whether the drawer is open.
 * - onOpenChange: (open: boolean) => void - Handler to open/close the drawer.
 * - sources: { label: string; url?: string; description?: string; favicon?: string }[] - List of sources to display.
 * - title: string - Title for the drawer.
 */
const SourcesDrawer = ({ open, onOpenChange, sources, title }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: { label: string; url?: string; description?: string; favicon?: string }[];
  title: string;
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-lg w-full bg-gradient-to-br from-background to-muted/60 shadow-2xl rounded-l-2xl border-none p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-8 pt-8 pb-2">
            <SheetTitle className="text-2xl font-bold mb-1 tracking-tight text-primary">{title}</SheetTitle>
            <SheetDescription className="mb-4 text-muted-foreground text-base">
              All sources referenced in the AI's response. Click a source to view more details.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2">
            {sources && sources.length > 0 ? (
              <div className="flex flex-col gap-4">
                {sources.map((source, idx) => (
                  <SourceCard
                    key={idx}
                    label={source.label}
                    url={source.url}
                    description={source.description}
                    favicon={source.favicon}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-16 text-lg">No sources available.</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SourcesDrawer; 