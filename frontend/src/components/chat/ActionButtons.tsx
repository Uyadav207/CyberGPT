import React from "react";
import { Button } from "../ui/button";
import { Share2, BookOpen } from "lucide-react";

interface ActionButtonsProps {
  onVisualise: () => void;
  onSources: () => void;
  visualiseDisabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onVisualise, onSources, visualiseDisabled }) => (
  <div className="flex gap-3 mt-4">
    <Button onClick={onVisualise} disabled={visualiseDisabled} variant="outline" className="flex items-center gap-2">
      <Share2 className="w-4 h-4" /> Visualise
    </Button>
    <Button onClick={onSources} variant="secondary" className="flex items-center gap-2">
      <BookOpen className="w-4 h-4" /> Sources
    </Button>
  </div>
);

export default ActionButtons; 