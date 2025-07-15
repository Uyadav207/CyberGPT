import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../ui/dialog";
import type { KGGraphHandle } from "../graph/KGGraph";

interface VisualiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphData: any;
  graphExplanation?: string;
  children?: React.ReactNode;
  legendData?: Array<{ type: string; color: string }>;
}

const VisualiseDialog: React.FC<VisualiseDialogProps> = ({ open, onOpenChange, graphData, graphExplanation, children, legendData }) => {
  const [showLegend, setShowLegend] = useState(false);
  const graphRef = useRef<KGGraphHandle>(null);

  // Auto-fit graph to modal on open
  useEffect(() => {
    if (open && graphRef.current) {
      setTimeout(() => graphRef.current?.fitToView(), 200);
    }
  }, [open, graphData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0"
        style={{
          width: '80vw',
          maxWidth: 1200,
          height: '80vh',
          maxHeight: 900,
          minWidth: 600,
          minHeight: 500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px 10px 28px', borderBottom: '1px solid #eee', background: '#fff', zIndex: 2 }}>
          <DialogTitle>Visualise Knowledge Graph</DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Zoom Controls */}
            <button
              onClick={() => graphRef.current?.zoomIn()}
              style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', fontWeight: 500, fontSize: 18, cursor: 'pointer', marginRight: 2 }}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => graphRef.current?.zoomOut()}
              style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', fontWeight: 500, fontSize: 18, cursor: 'pointer', marginRight: 2 }}
              title="Zoom Out"
            >
              –
            </button>
            <button
              onClick={() => graphRef.current?.fitToView()}
              style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', fontWeight: 500, fontSize: 16, cursor: 'pointer', marginRight: 10 }}
              title="Reset View"
            >
              ⟳
            </button>
            {/* Legend Toggle */}
            <button
              onClick={() => setShowLegend((v) => !v)}
              style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '6px 16px',
                fontWeight: 500,
                fontSize: 15,
                cursor: 'pointer',
                marginRight: 8,
              }}
            >
              Legend
            </button>
            <DialogClose asChild>
              <button style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', padding: 0, margin: 0, lineHeight: 1 }} title="Close">×</button>
            </DialogClose>
          </div>
        </div>
        {/* Modal Content Area */}
        <div style={{ display: 'flex', flex: 1, position: 'relative', background: '#fafbfc' }}>
          {/* Main Graph Area */}
          <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
            {graphExplanation && <div className="mb-2 text-muted-foreground text-sm" style={{ padding: '12px 24px 0 24px' }}>{graphExplanation}</div>}
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              {children && React.isValidElement(children)
                ? React.cloneElement(children, { ref: graphRef })
                : (
                  <div className="w-full h-full flex items-center justify-center bg-muted rounded border border-dashed text-muted-foreground">
                    Graph visualisation coming soon...
                  </div>
                )}
            </div>
          </div>
          {/* Vertical Legend Panel (toggle) */}
          {showLegend && legendData && legendData.length > 0 && (
            <div
              style={{
                width: 200,
                minWidth: 140,
                maxHeight: '100%',
                background: '#fff',
                borderLeft: '1px solid #eee',
                padding: '24px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                zIndex: 3,
                boxShadow: '0 0 12px rgba(0,0,0,0.04)',
                overflowY: 'auto',
              }}
            >
              <strong style={{ marginBottom: 16, fontSize: 17, color: '#222', letterSpacing: 0.2 }}>Legend</strong>
              {legendData.map(({ type, color }) => (
                <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, width: '100%' }}>
                  <span style={{ background: color, width: 20, height: 20, borderRadius: '50%', display: 'inline-block', border: '1.5px solid #aaa', flexShrink: 0 }}></span>
                  <span
                    style={{ fontSize: 15, color: '#222', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, cursor: 'pointer' }}
                    title={type}
                  >
                    {type}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisualiseDialog; 