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

  // Node type configurations with sidebar color scheme
  const nodeConfig = {
    vulnerability: { color: 'hsl(var(--destructive))', icon: AlertTriangle, size: 20 },
    mitigation: { color: 'hsl(var(--chart-2))', icon: Shield, size: 18 },
    source: { color: 'hsl(var(--sidebar-primary))', icon: Info, size: 16 },
    cve: { color: 'hsl(var(--chart-4))', icon: Target, size: 22 },
    problem: { color: 'hsl(var(--chart-5))', icon: Network, size: 24 },
    affected: { color: 'hsl(var(--chart-1))', icon: Zap, size: 19 },
    risk: { color: 'hsl(var(--destructive))', icon: AlertTriangle, size: 21 }
  };

  // Link type configurations with sidebar color scheme
  const linkConfig = {
    mitigates: { color: 'hsl(var(--chart-2))', width: 3 },
    affects: { color: 'hsl(var(--destructive))', width: 2 },
    references: { color: 'hsl(var(--sidebar-primary))', width: 1 },
    causes: { color: 'hsl(var(--chart-4))', width: 2.5 },
    relates_to: { color: 'hsl(var(--chart-5))', width: 1.5 }
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
            Critical: 'hsl(var(--destructive))',
            High: 'hsl(var(--chart-1))',
            Medium: 'hsl(var(--chart-4))',
            Low: 'hsl(var(--chart-2))',
            Info: 'hsl(var(--sidebar-primary))'
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
      .attr('fill', 'hsl(var(--sidebar-foreground))')
      .style('pointer-events', 'none');

    // Add node type icons
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('font-size', '14px')
      .attr('fill', 'hsl(var(--sidebar-primary-foreground))')
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
    <div className={`relative bg-sidebar border border-sidebar-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5 text-sidebar-primary" />
          <h3 className="text-lg font-semibold text-sidebar-foreground">
            Knowledge Graph Visualization
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetZoom}
            className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-sidebar bg-opacity-75 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sidebar-primary"></div>
              <span className="text-sidebar-foreground">Generating graph...</span>
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
        <div className="absolute bottom-4 right-4 bg-sidebar px-3 py-1 rounded-lg shadow-lg border border-sidebar-border">
          <span className="text-sm text-sidebar-foreground">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-sidebar p-4 rounded-lg shadow-lg border border-sidebar-border max-w-xs">
          <h4 className="text-sm font-semibold text-sidebar-foreground mb-3">Node Types</h4>
          <div className="space-y-2">
            {Object.entries(nodeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-sidebar-foreground/70 capitalize">
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
            className="absolute top-0 right-0 w-80 h-full bg-sidebar border-l border-sidebar-border shadow-lg overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-sidebar-foreground">
                  Node Details
                </h4>
                <button
                  onClick={clearSelection}
                  className="p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/70">Label</label>
                  <p className="text-sidebar-foreground font-semibold">{selectedNode.label}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/70">Type</label>
                  <p className="text-sidebar-foreground capitalize">{selectedNode.type}</p>
                </div>
                
                {selectedNode.severity && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">Severity</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedNode.severity === 'Critical' ? 'bg-destructive/20 text-destructive' :
                      selectedNode.severity === 'High' ? 'bg-chart-1/20 text-chart-1' :
                      selectedNode.severity === 'Medium' ? 'bg-chart-4/20 text-chart-4' :
                      selectedNode.severity === 'Low' ? 'bg-chart-2/20 text-chart-2' :
                      'bg-sidebar-primary/20 text-sidebar-primary'
                    }`}>
                      {selectedNode.severity}
                    </span>
                  </div>
                )}
                
                {selectedNode.cvss && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">CVSS Score</label>
                    <p className="text-sidebar-foreground">{selectedNode.cvss}</p>
                  </div>
                )}
                
                {selectedNode.description && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">Description</label>
                    <p className="text-sidebar-foreground text-sm">{selectedNode.description}</p>
                  </div>
                )}
                
                {selectedNode.source && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">Source</label>
                    <p className="text-sidebar-foreground text-sm">{selectedNode.source}</p>
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
            className="absolute bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border shadow-lg"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-sidebar-foreground">
                  Link Details
                </h4>
                <button
                  onClick={clearSelection}
                  className="p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/70">Type</label>
                  <p className="text-sidebar-foreground capitalize">{selectedLink.type}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/70">Connection</label>
                  <p className="text-sidebar-foreground text-sm">
                    {data.nodes.find(n => n.id === selectedLink.source)?.label} → {data.nodes.find(n => n.id === selectedLink.target)?.label}
                  </p>
                </div>
                
                {selectedLink.description && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">Description</label>
                    <p className="text-sidebar-foreground text-sm">{selectedLink.description}</p>
                  </div>
                )}
                
                {selectedLink.strength && (
                  <div>
                    <label className="text-sm font-medium text-sidebar-foreground/70">Strength</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-sidebar-accent rounded-full h-2">
                        <div
                          className="bg-sidebar-primary h-2 rounded-full"
                          style={{ width: `${(selectedLink.strength / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-sidebar-foreground/70">{selectedLink.strength}/10</span>
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