import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../ui/dialog";
// import KGGraph from "../graph/KGGraph"; // To be implemented

interface VisualiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphData: any;
  graphExplanation?: string;
  children?: React.ReactNode;
}

const VisualiseDialog: React.FC<VisualiseDialogProps> = ({ open, onOpenChange, graphData, graphExplanation, children }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Visualise Knowledge Graph</DialogTitle>
      </DialogHeader>
      {graphExplanation && <div className="mb-2 text-muted-foreground text-sm">{graphExplanation}</div>}
      {children ? (
        <div className="w-full h-72 flex items-center justify-center bg-muted rounded border border-dashed text-muted-foreground">
          {children}
        </div>
      ) : (
        <div className="w-full h-72 flex items-center justify-center bg-muted rounded border border-dashed text-muted-foreground">
          Graph visualisation coming soon...
        </div>
      )}
      <DialogClose asChild>
        <button className="mt-4 w-full py-2 rounded bg-secondary text-primary font-semibold hover:bg-primary/10 transition">Close</button>
      </DialogClose>
    </DialogContent>
  </Dialog>
);

export default VisualiseDialog; 