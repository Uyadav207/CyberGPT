import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import GraphVisualization from './GraphVisualization';
import { graphApis } from '../../api/graph';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { GraphData, GraphGenerationRequest, GraphElements } from '../../types/graphVisualization';
import type { Message } from '../../types/chats';

// Helper function to convert graphVisualization to GraphData format
const convertGraphVisualizationToGraphData = (graphVisualization: GraphElements): GraphData => {
  const nodes: any[] = [];
  const links: any[] = [];
  const nodeMap = new Map<string, any>();

  // Convert vulnerabilities
  if (graphVisualization.vulnerabilities) {
    graphVisualization.vulnerabilities.forEach((vuln, index) => {
      const nodeId = `vuln-${index}`;
      const node = {
        id: nodeId,
        label: vuln.name,
        type: 'vulnerability' as const,
        description: vuln.description,
        severity: vuln.severity,
        cvss: vuln.cvss,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(vuln.id, nodeId);
    });
  }

  // Convert mitigations
  if (graphVisualization.mitigations) {
    graphVisualization.mitigations.forEach((mit, index) => {
      const nodeId = `mit-${index}`;
      const node = {
        id: nodeId,
        label: mit.name,
        type: 'mitigation' as const,
        description: mit.description,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(mit.id, nodeId);
    });
  }

  // Convert sources
  if (graphVisualization.sources) {
    graphVisualization.sources.forEach((src, index) => {
      const nodeId = `src-${index}`;
      const node = {
        id: nodeId,
        label: src.name,
        type: 'source' as const,
        description: src.description,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(src.id, nodeId);
    });
  }

  // Convert CVEs
  if (graphVisualization.cves) {
    graphVisualization.cves.forEach((cve, index) => {
      const nodeId = `cve-${index}`;
      const node = {
        id: nodeId,
        label: cve.cveId,
        type: 'cve' as const,
        description: cve.description,
        severity: cve.severity,
        cvss: cve.cvss,
        source: 'NVD'
      };
      nodes.push(node);
      nodeMap.set(cve.id, nodeId);
    });
  }

  // Convert problems
  if (graphVisualization.problems) {
    graphVisualization.problems.forEach((prob, index) => {
      const nodeId = `prob-${index}`;
      const node = {
        id: nodeId,
        label: prob.name,
        type: 'problem' as const,
        description: prob.description,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(prob.id, nodeId);
    });
  }

  // Convert affected
  if (graphVisualization.affected) {
    graphVisualization.affected.forEach((aff, index) => {
      const nodeId = `aff-${index}`;
      const node = {
        id: nodeId,
        label: aff.name,
        type: 'affected' as const,
        description: aff.description,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(aff.id, nodeId);
    });
  }

  // Convert risks
  if (graphVisualization.risks) {
    graphVisualization.risks.forEach((risk, index) => {
      const nodeId = `risk-${index}`;
      const node = {
        id: nodeId,
        label: risk.name,
        type: 'risk' as const,
        description: risk.description,
        severity: risk.level,
        source: 'extracted'
      };
      nodes.push(node);
      nodeMap.set(risk.id, nodeId);
    });
  }

  // Convert relationships to links
  if (graphVisualization.relationships) {
    graphVisualization.relationships.forEach((rel, index) => {
      const sourceNodeId = nodeMap.get(rel.sourceId);
      const targetNodeId = nodeMap.get(rel.targetId);
      
      if (sourceNodeId && targetNodeId) {
        const link = {
          id: `link-${index}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: rel.type as any,
          strength: rel.strength,
          description: rel.description
        };
        links.push(link);
      }
    });
  }

  return {
    nodes,
    links,
    metadata: {
      title: 'Knowledge Graph Visualization',
      description: 'Graph visualization of cybersecurity entities and relationships',
      createdAt: Date.now(),
      messageId: '',
      chatId: ''
    }
  };
};

// Helper function to convert GraphData to graphVisualization format
const convertGraphDataToGraphVisualization = (graphData: GraphData): GraphElements => {
  const graphVisualization: GraphElements = {};

  // Group nodes by type
  const vulnerabilities: any[] = [];
  const mitigations: any[] = [];
  const sources: any[] = [];
  const cves: any[] = [];
  const problems: any[] = [];
  const affected: any[] = [];
  const risks: any[] = [];
  const relationships: any[] = [];

  // Convert nodes to graph elements
  graphData.nodes.forEach((node, index) => {
    const element = {
      id: node.id,
      name: node.label,
      description: node.description,
    };

    switch (node.type) {
      case 'vulnerability':
        vulnerabilities.push({
          ...element,
          severity: node.severity,
          cvss: node.cvss,
        });
        break;
      case 'mitigation':
        mitigations.push(element);
        break;
      case 'source':
        sources.push(element);
        break;
      case 'cve':
        cves.push({
          ...element,
          cveId: node.label,
          severity: node.severity,
          cvss: node.cvss,
        });
        break;
      case 'problem':
        problems.push(element);
        break;
      case 'affected':
        affected.push(element);
        break;
      case 'risk':
        risks.push({
          ...element,
          level: node.severity,
        });
        break;
    }
  });

  // Convert links to relationships
  graphData.links.forEach((link, index) => {
    relationships.push({
      id: link.id,
      sourceId: link.source,
      targetId: link.target,
      type: link.type,
      strength: link.strength,
      description: link.description,
    });
  });

  // Add non-empty arrays to graphVisualization
  if (vulnerabilities.length > 0) graphVisualization.vulnerabilities = vulnerabilities;
  if (mitigations.length > 0) graphVisualization.mitigations = mitigations;
  if (sources.length > 0) graphVisualization.sources = sources;
  if (cves.length > 0) graphVisualization.cves = cves;
  if (problems.length > 0) graphVisualization.problems = problems;
  if (affected.length > 0) graphVisualization.affected = affected;
  if (risks.length > 0) graphVisualization.risks = risks;
  if (relationships.length > 0) graphVisualization.relationships = relationships;

  return graphVisualization;
};

interface GraphButtonProps {
  message: Message;
  chatId: string;
  className?: string;
}

const GraphButton: React.FC<GraphButtonProps> = ({ message, chatId, className = '' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveGraphMutation = useMutation(api.graphVisualizations.saveGraphVisualization);
  const getGraphMutation = useMutation(api.graphVisualizations.getGraphByMessageId);

  const handleGenerateGraph = async () => {
    if (message.sender !== 'ai') return;

    setIsGenerating(true);
    setError(null);

    try {
      // First, try to get existing graph from Convex
      const existingGraph = await getGraphMutation({ 
        messageId: message.id, 
        chatId 
      });
      
      if (existingGraph) {
        // Convert graphVisualization to GraphData format for the visualization component
        const graphData = convertGraphVisualizationToGraphData(existingGraph);
        setGraphData(graphData);
        setShowGraph(true);
        setIsGenerating(false);
        return;
      }

      // Generate new graph if none exists
      const request: GraphGenerationRequest = {
        messageId: message.id,
        chatId,
        question: message.message || '',
        answer: message.message || '',
        reasoning: message.reasoningTrace,
        sources: message.sources,
        jargons: message.jargons,
        cveInfo: message.cveInfo
      };

      const response = await graphApis.generateGraph(request);

      if (response.success && response.graphData) {
        // Convert GraphData to graphVisualization format for storage
        const graphVisualization = convertGraphDataToGraphVisualization(response.graphData);
        
        // Save to Convex
        await saveGraphMutation({
          messageId: message.id,
          chatId,
          graphVisualization
        });

        setGraphData(response.graphData);
        setShowGraph(true);
      } else {
        throw new Error(response.error || 'Failed to generate graph');
      }
    } catch (err) {
      console.error('[GraphButton] Error generating graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate graph');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGraph = () => {
    if (graphData) {
      setShowGraph(!showGraph);
    } else {
      handleGenerateGraph();
    }
  };

  // Only show for AI messages
  if (message.sender !== 'ai') {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Graph Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleGraph}
            disabled={isGenerating}
            className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
              showGraph 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showGraph ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Network className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isGenerating 
            ? 'Generating graph...' 
            : showGraph 
              ? 'Hide knowledge graph' 
              : 'View knowledge graph'
          }
        </TooltipContent>
      </Tooltip>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400 max-w-xs z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graph Visualization Modal */}
      <AnimatePresence>
        {showGraph && graphData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowGraph(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <GraphVisualization
                data={graphData}
                width={800}
                height={600}
                className="w-full h-full"
                onNodeClick={(node) => {
                  console.log('Node clicked:', node);
                }}
                onLinkClick={(link) => {
                  console.log('Link clicked:', link);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphButton; 