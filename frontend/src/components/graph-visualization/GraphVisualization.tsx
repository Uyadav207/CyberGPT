import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Info, 
  Target, 
  Link, 
  X,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';
import type { GraphData, GraphNode, GraphLink, GraphVisualizationProps } from '../../types/graphVisualization';

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  onLinkClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Node type configurations
  const nodeConfig = {
    vulnerability: { color: '#ef4444', icon: AlertTriangle, size: 20 },
    mitigation: { color: '#10b981', icon: Shield, size: 18 },
    source: { color: '#3b82f6', icon: Info, size: 16 },
    cve: { color: '#f59e0b', icon: Target, size: 22 },
    problem: { color: '#8b5cf6', icon: Network, size: 24 },
    affected: { color: '#ec4899', icon: Zap, size: 19 },
    risk: { color: '#dc2626', icon: AlertTriangle, size: 21 }
  };

  // Link type configurations
  const linkConfig = {
    mitigates: { color: '#10b981', width: 3 },
    affects: { color: '#ef4444', width: 2 },
    references: { color: '#3b82f6', width: 1 },
    causes: { color: '#f59e0b', width: 2.5 },
    relates_to: { color: '#8b5cf6', width: 1.5 }
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    setIsLoading(true);
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        setZoomLevel(event.transform.k);
        svg.select('.graph-container')
          .attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create graph container
    const graphContainer = svg.append('g')
      .attr('class', 'graph-container');

    // Create links
    const links = graphContainer.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => linkConfig[d.type]?.color || '#666')
      .attr('stroke-width', (d) => linkConfig[d.type]?.width || 1)
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedLink(d);
        onLinkClick?.(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', (linkConfig[d.type]?.width || 1) * 1.5);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', linkConfig[d.type]?.width || 1);
      });

    // Create nodes
    const nodes = graphContainer.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .call(d3.drag<any, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add node circles
    nodes.append('circle')
      .attr('r', (d) => nodeConfig[d.type]?.size || 15)
      .attr('fill', (d) => {
        if (d.severity) {
          const severityColors = {
            Critical: '#dc2626',
            High: '#ea580c',
            Medium: '#d97706',
            Low: '#65a30d',
            Info: '#3b82f6'
          };
          return severityColors[d.severity] || nodeConfig[d.type]?.color;
        }
        return nodeConfig[d.type]?.color || '#666';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8);

    // Add node labels
    nodes.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .style('pointer-events', 'none');

    // Add node type icons
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('font-size', '14px')
      .attr('fill', '#fff')
      .style('pointer-events', 'none')
      .text((d) => {
        const icons = {
          vulnerability: '⚠️',
          mitigation: '🛡️',
          source: '📚',
          cve: '🎯',
          problem: '🔗',
          affected: '⚡',
          risk: '🚨'
        };
        return icons[d.type] || '●';
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    setIsLoading(false);

    return () => {
      simulation.stop();
    };
  }, [data, width, height, onNodeClick, onLinkClick]);

  const resetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        d3.zoom().transform as any,
        d3.zoomIdentity
      );
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const clearSelection = () => {
    setSelectedNode(null);
    setSelectedLink(null);
  };

  const currentWidth = isFullscreen ? window.innerWidth - 40 : width;
  const currentHeight = isFullscreen ? window.innerHeight - 100 : height;

  return (
    <div className={`relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Knowledge Graph Visualization
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetZoom}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-75 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-300">Generating graph...</span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          width={currentWidth}
          height={currentHeight}
          className="w-full h-full"
        />

        {/* Zoom Level Indicator */}
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Node Types</h4>
          <div className="space-y-2">
            {Object.entries(nodeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Node Details
                </h4>
                <button
                  onClick={clearSelection}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Label</label>
                  <p className="text-gray-900 dark:text-white font-semibold">{selectedNode.label}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedNode.type}</p>
                </div>
                
                {selectedNode.severity && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedNode.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                      selectedNode.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                      selectedNode.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      selectedNode.severity === 'Low' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedNode.severity}
                    </span>
                  </div>
                )}
                
                {selectedNode.cvss && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CVSS Score</label>
                    <p className="text-gray-900 dark:text-white">{selectedNode.cvss}</p>
                  </div>
                )}
                
                {selectedNode.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <p className="text-gray-900 dark:text-white text-sm">{selectedNode.description}</p>
                  </div>
                )}
                
                {selectedNode.source && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
                    <p className="text-gray-900 dark:text-white text-sm">{selectedNode.source}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link Details Panel */}
      <AnimatePresence>
        {selectedLink && (
          <motion.div
            initial={{ opacity: 0, y: 300 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Link Details
                </h4>
                <button
                  onClick={clearSelection}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedLink.type}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection</label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {data.nodes.find(n => n.id === selectedLink.source)?.label} → {data.nodes.find(n => n.id === selectedLink.target)?.label}
                  </p>
                </div>
                
                {selectedLink.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <p className="text-gray-900 dark:text-white text-sm">{selectedLink.description}</p>
                  </div>
                )}
                
                {selectedLink.strength && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Strength</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(selectedLink.strength / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{selectedLink.strength}/10</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphVisualization; 