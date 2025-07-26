import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Loader2, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import GraphVisualization from './GraphVisualization';
import { graphApis } from '../../api/graph';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { GraphData, GraphGenerationRequest, GraphElements } from '../../types/graphVisualization.d';
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
export const convertGraphDataToGraphVisualization = (graphData: GraphData): GraphElements => {
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

  // Convert nodes to graph elements according to schema
  graphData.nodes.forEach((node, index) => {
    switch (node.type) {
      case 'vulnerability':
        vulnerabilities.push({
          id: node.id,
          name: node.label,
          description: node.description,
          severity: node.severity,
          cvss: node.cvss || 0.0, // Ensure cvss is never null
          // Add optional fields from metadata if available
          cveIds: node.metadata?.originalEntity?.cveIds || [],
          affectedSystems: node.metadata?.kgData?.affected || [],
          attackVectors: node.metadata?.originalEntity?.attackVectors || [],
          references: node.metadata?.kgData?.sources?.map((s: any) => s.name) || [],
        });
        break;
      case 'mitigation':
        mitigations.push({
          id: node.id,
          name: node.label,
          description: node.description,
          type: node.metadata?.originalEntity?.type || 'preventive',
          effectiveness: node.metadata?.originalEntity?.effectiveness || 8.0,
          implementation: node.metadata?.originalEntity?.implementation || '',
          cost: node.metadata?.originalEntity?.cost || '',
          references: node.metadata?.kgData?.sources?.map((s: any) => s.name) || [],
        });
        break;
      case 'source':
        sources.push({
          id: node.id,
          name: node.label,
          type: node.metadata?.originalEntity?.type || 'standard',
          url: node.metadata?.originalEntity?.url || '',
          reliability: node.metadata?.originalEntity?.reliability || 8.0,
          lastUpdated: Date.now() || 0,
          description: node.description,
        });
        break;
      case 'cve':
        cves.push({
          id: node.id,
          cveId: node.label,
          description: node.description,
          severity: node.severity,
          cvss: node.cvss || 0.0, // Ensure cvss is never null
          publishedDate: Date.now() || 0,
          affectedProducts: node.metadata?.kgData?.affectedProducts || [],
          references: node.metadata?.kgData?.references || [],
          patches: node.metadata?.kgData?.patches || [],
        });
        break;
      case 'problem':
        problems.push({
          id: node.id,
          name: node.label,
          description: node.description,
          category: node.metadata?.originalEntity?.category || 'security',
          impact: node.metadata?.originalEntity?.impact || 'high',
          priority: node.metadata?.originalEntity?.priority || 'high',
          affectedComponents: node.metadata?.originalEntity?.affectedComponents || [],
        });
        break;
      case 'affected':
        affected.push({
          id: node.id,
          name: node.label,
          type: node.metadata?.originalEntity?.type || 'system',
          description: node.description,
          impact: node.metadata?.originalEntity?.impact || 'critical',
          systems: node.metadata?.originalEntity?.systems || [],
          users: node.metadata?.originalEntity?.users || [],
        });
        break;
      case 'risk':
        risks.push({
          id: node.id,
          name: node.label,
          level: node.severity,
          probability: node.metadata?.originalEntity?.probability || 8.0,
          impact: node.metadata?.originalEntity?.impact || 'high',
          description: node.description,
          mitigation: node.metadata?.originalEntity?.mitigation || '',
          monitoring: node.metadata?.originalEntity?.monitoring || '',
        });
        break;
    }
  });

  // Convert links to relationships according to schema
  graphData.links.forEach((link, index) => {
          relationships.push({
        id: link.id,
        sourceId: link.source,
        targetId: link.target,
        type: link.type,
        strength: link.strength || 8.0,
        description: link.description || '',
        evidence: '',
        confidence: 0.8,
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

  console.log('[GraphButton] Converted graph visualization:', {
    vulnerabilities: vulnerabilities.length,
    mitigations: mitigations.length,
    sources: sources.length,
    cves: cves.length,
    problems: problems.length,
    affected: affected.length,
    risks: risks.length,
    relationships: relationships.length,
  });

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

  const handleGenerateGraph = async () => {
    if (message.sender !== 'ai') return;

    setIsGenerating(true);
    setError(null);

    try {
      // Debug chatId value
      console.log('[GraphButton] Received chatId:', { chatId, type: typeof chatId, length: chatId?.length });
      
      // Validate chatId before proceeding
      if (!chatId || chatId === 'undefined' || chatId === 'null' || chatId.trim() === '') {
        console.error('[GraphButton] Invalid chatId detected:', { chatId, type: typeof chatId });
        throw new Error(`Invalid chat ID provided: "${chatId}"`);
      }

      // First, try to get existing graph from REST API
      console.log('[GraphButton] Checking for existing graph:', { messageId: message.id, chatId });
      const existingGraph = await graphApis.getGraphByMessageId(message.id || '', chatId);
      
      if (existingGraph) {
        console.log('[GraphButton] Found existing graph:', existingGraph);
        // Convert graphVisualization to GraphData format for the visualization component
        const graphData = convertGraphVisualizationToGraphData(existingGraph);
        setGraphData(graphData);
        setShowGraph(true);
        setIsGenerating(false);
        return;
      }

      console.log('[GraphButton] No existing graph found, generating new one...');

      // Generate new graph if none exists
      const request: GraphGenerationRequest = {
        messageId: message.id || message.humanInTheLoopId || '',
        chatId,
        question: message.message || '',
        answer: message.message || '',
        reasoning: message.reasoningTrace ? JSON.stringify(message.reasoningTrace) : undefined,
        sources: message.sourceLinks?.map(link => link.title) || [],
        jargons: message.jargons?.reduce((acc, jargon) => {
          acc[jargon.term] = jargon.description;
          return acc;
        }, {} as Record<string, string>) || {},
        cveInfo: message.cveDescriptionsMap ? {
          cve_id: Object.keys(message.cveDescriptionsMap)[0],
          cve_desc: Object.values(message.cveDescriptionsMap)[0],
          mitigation: undefined
        } : undefined
      };

      console.log('[GraphButton] Generating graph with request:', request);
      const response = await graphApis.generateGraph(request);

      console.log('[GraphButton] Graph generation response:', response);
      
      if (response.success && response.graphData) {
        console.log('[GraphButton] Graph generated successfully, saving to Convex...');
        // Convert GraphData to graphVisualization format for storage
        const graphVisualization = convertGraphDataToGraphVisualization(response.graphData);
        
        // Save to Convex
        await saveGraphMutation({
          messageId: message.id || '',
          chatId,
          graphVisualization: graphVisualization
        });

        console.log('[GraphButton] Graph saved to Convex successfully');
        setGraphData(response.graphData);
        setShowGraph(true);
      } else {
        console.error('[GraphButton] Graph generation failed:', response.error);
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
  console.log('[GraphButton] Checking message sender:', {
    messageId: message.id,
    sender: message.sender,
    shouldShow: message.sender === 'ai'
  });
  
  if (message.sender !== 'ai') {
    console.log('[GraphButton] Not showing for non-AI message');
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Graph Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            onClick={toggleGraph}
            disabled={isGenerating}
            className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
              showGraph 
                ? 'bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent/80' 
                : 'hover:bg-sidebar-accent'
            }`}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : showGraph ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Network className="w-5 h-5" />
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