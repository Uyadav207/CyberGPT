import React from "react";
import ReasoningCollapsible from "./ReasoningCollapsible";
import ActionButtons from "./ActionButtons";
import SourcesDrawer from "./SourcesDrawer";
import VisualiseDialog from "./VisualiseDialog";
import KGGraph from "../graph/KGGraph";
import MarkdownViewer from "../file/MarkdownViewer";
import mira_logo from "../../assets/Mira_logo.png";
import { motion } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Info } from "lucide-react";
import axios from "../../api/axios";

/**
 * MiraModularResponse
 *
 * Modular UI section for the latest AI response in the chat.
 * Includes: AI avatar, ReasoningCollapsible, AI message bubble, ActionButtons, SourcesDrawer, VisualiseDialog.
 *
 * Props:
 * - reasoning: string - The reasoning text to display.
 * - reasoningLoading: boolean - Whether reasoning is streaming/loading.
 * - thinkingDuration: number | null - Time taken for reasoning (seconds).
 * - latestAIMessage: { id: string; message: string } | undefined - The latest AI message object.
 * - graphData: any - Data for the knowledge graph visualisation.
 * - graphExplanation: string - Explanation for the graph.
 * - sources: any[] - List of sources to show in the drawer.
 * - showSourcesDrawer: boolean - Whether the sources drawer is open.
 * - setShowSourcesDrawer: (open: boolean) => void - Setter for sources drawer.
 * - showVisualiseDialog: boolean - Whether the visualise dialog is open.
 * - setShowVisualiseDialog: (open: boolean) => void - Setter for visualise dialog.
 * - onVisualise: () => void - Handler for visualise button.
 * - onSources: () => void - Handler for sources button.
 */
const MiraModularResponse = ({
  reasoning,
  reasoningLoading,
  thinkingDuration,
  latestAIMessage,
  graphData,
  graphExplanation,
  sources,
  showSourcesDrawer,
  setShowSourcesDrawer,
  showVisualiseDialog,
  setShowVisualiseDialog,
  onVisualise,
  onSources,
}: {
  reasoning: string;
  reasoningLoading: boolean;
  thinkingDuration: number | null;
  latestAIMessage?: { id: string; message: string };
  graphData: any;
  graphExplanation: string;
  sources: any[];
  showSourcesDrawer: boolean;
  setShowSourcesDrawer: (open: boolean) => void;
  showVisualiseDialog: boolean;
  setShowVisualiseDialog: (open: boolean) => void;
  onVisualise: () => void;
  onSources: () => void;
}) => {
  const [showWhy, setShowWhy] = useState(false);
  const [whyLoading, setWhyLoading] = useState(false);
  const [whyData, setWhyData] = useState<any>(null);
  const [whyError, setWhyError] = useState<string | null>(null);

  const handleWhyClick = async () => {
    if (!latestAIMessage) return;
    setShowWhy(true);
    setWhyLoading(true);
    setWhyError(null);
    try {
      const res = await axios.post("/api/graphrag/explain", { input: latestAIMessage.message });
      setWhyData(res.data);
    } catch (e: any) {
      setWhyError(e?.message || "Failed to fetch explanation");
    } finally {
      setWhyLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-start mt-6 p-0 bg-transparent rounded-2xl border-none relative">
      {/* AI Avatar at the top-left */}
      {/* <img
        src={mira_logo}
        alt="Avatar"
        className="w-12 h-12 object-cover rounded-full absolute -top-6 left-6 bg-background border-2 border-primary shadow-md"
        style={{ zIndex: 2 }}
      /> */}
      <div className="flex flex-col w-full mt-8 gap-6">
        {/* Reasoning Section */}
        {/* AI Message Section with Why button */}
        {latestAIMessage && (
          <motion.div
            key={latestAIMessage.id}
            className="mb-0 text-left w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-block px-5 py-4 rounded-2xl max-w-full bg-white dark:bg-primary-950 border border-primary/20 shadow-md hover:shadow-lg transition text-foreground overflow-x-auto text-pretty break-words text-base font-medium ring-1 ring-primary/10 focus-within:ring-2 focus-within:ring-primary/30 relative">
              <MarkdownViewer content={latestAIMessage.message} />
              <button
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-primary-900"
                title="Why this?"
                onClick={handleWhyClick}
              >
                <Info className="w-5 h-5 text-primary" />
              </button>
            </div>
          </motion.div>
        )}
        {/* Why Pop-up */}
        <Dialog open={showWhy} onOpenChange={setShowWhy}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Why this recommendation?</DialogTitle>
            </DialogHeader>
            {whyLoading && <div>Loading...</div>}
            {whyError && <div className="text-red-500">{whyError}</div>}
            {whyData && (
              <div className="space-y-4">
                <div>
                  <strong>Reasoning Chain:</strong>
                  <ul className="list-disc ml-5">
                    {whyData.reasoningChain?.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Graph Traversal:</strong>
                  <pre className="bg-gray-100 dark:bg-primary-900 rounded p-2 text-xs overflow-x-auto max-h-40">{JSON.stringify(whyData.traversal, null, 2)}</pre>
                </div>
                {whyData.sources && whyData.sources.length > 0 && (
                  <div>
                    <strong>Sources:</strong>
                    <ul className="list-disc ml-5">
                      {whyData.sources.map((src: string, i: number) => (
                        <li key={i}><a href={src} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{src}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
                {whyData.confidence && (
                  <div>
                    <strong>Confidence:</strong> {whyData.confidence}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Action Buttons Section */}
        <div className="w-full flex flex-row items-center justify-start gap-4 mt-2 mb-1 px-1">
          <ActionButtons
            onVisualise={onVisualise}
            onSources={onSources}
          />
        </div>
        {/* Drawers/Dialogs */}
        <SourcesDrawer
          open={showSourcesDrawer}
          onOpenChange={setShowSourcesDrawer}
          sources={sources}
          title="Sources"
        />
        <VisualiseDialog
          open={showVisualiseDialog}
          onOpenChange={setShowVisualiseDialog}
          graphData={graphData}
          graphExplanation={graphExplanation}
        >
          {graphData && <KGGraph data={graphData} />}
        </VisualiseDialog>
      </div>
    </div>
  );
};

export default MiraModularResponse;