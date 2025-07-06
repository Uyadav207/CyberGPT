import React from "react";
import ReasoningCollapsible from "./ReasoningCollapsible";
import ActionButtons from "./ActionButtons";
import SourcesDrawer from "./SourcesDrawer";
import VisualiseDialog from "./VisualiseDialog";
import KGGraph from "../graph/KGGraph";
import MarkdownViewer from "../file/MarkdownViewer";
import mira_logo from "../../assets/Mira_logo.png";
import { motion } from "framer-motion";

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
        {/* AI Message Section */}
        {latestAIMessage && (
          <motion.div
            key={latestAIMessage.id}
            className="mb-0 text-left w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-block px-5 py-4 rounded-2xl max-w-full bg-white dark:bg-primary-950 border border-primary/20 shadow-md hover:shadow-lg transition text-foreground overflow-x-auto text-pretty break-words text-base font-medium ring-1 ring-primary/10 focus-within:ring-2 focus-within:ring-primary/30">
              <MarkdownViewer content={latestAIMessage.message} />
            </div>
          </motion.div>
        )}
        {/* Action Buttons Section */}
        <div className="w-full flex flex-row items-center justify-start gap-4 mt-2 mb-1 px-1">
          <ActionButtons
            onVisualise={onVisualise}
            onSources={onSources}
            visualiseDisabled={!graphData}
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