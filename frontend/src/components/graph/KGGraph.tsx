import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as d3 from "d3";

interface Node {
  id: string;
  label: string;
  type?: string;
  name?: string;
  cve_id?: string;
  short_description?: string;
  description?: string;
  url?: string; // Added for Reference nodes
  cpe?: string; // Added for Component nodes
  [key: string]: any;
}

interface Link {
  source: string;
  target: string;
  label?: string;
}

interface KGGraphProps {
  data: {
    nodes: Node[];
    links: Link[];
  };
  width?: number;
  height?: number;
}

export const colorMap: Record<string, string> = {
  Vulnerability: "#e74c3c",
  Vendor: "#2980b9",
  Mitigation: "#27ae60",
  Reference: "#8e44ad",
  Component: "#f39c12",
  CWE: "#f1c40f",
  User: "#34495e",
  Standard: "#16a085",
  Query: "#9b59b6",
  CybersecurityConcept: "#3498db",
  CybersecurityTopic: "#2ecc71",
  ExampleVulnerability: "#e67e22",
  Unknown: "#95a5a6",
};

// Add a type for the zoom controls
export interface KGGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
}

function elaborateDescription(type: string, n: any, question: string): string {
  const q = question.toLowerCase();
  // Try to extract main concept from question (e.g., "sql injection")
  const mainConcept = (n.name || n.label || n.type || '').toLowerCase();
  if (q.includes(mainConcept) || mainConcept.includes(q)) {
    // If node matches the question concept, make it specific
    return `${n.name} is directly related to your question about "${question}". ${
      n.description ? n.description : ''
    } This node provides specific insight into ${question}, including risks, mitigations, and real-world impact.`;
  }
  if (type === 'example') {
    return `${n.name} is a demonstration vulnerability related to "${question}". This example shows how an attack might work in the context of your query.`;
  } else if (type === 'query') {
    return n.text
      ? `This node represents your question: “${n.text}”. The graph is generated to help answer it with relevant knowledge about "${question}".`
      : 'This node represents your question. The graph is built to provide a visual answer.';
  } else if (type === 'concept') {
    return n.name
      ? `${n.name} is a core concept in the context of "${question}". Understanding this is essential for addressing related threats.`
      : `A concept related to "${question}".`;
  } else if (type === 'topic') {
    return n.name
      ? `${n.name} is an important topic for understanding "${question}".`
      : `A topic relevant to "${question}".`;
  }
  return n.description || `A ${type} node in the knowledge graph, relevant to "${question}".`;
}

const getNodeDisplay = (node: Node): string => {
  if (node.label === 'Query' && node.text) return String(node.text).substring(0, 30) + '...';
  if (node.label === 'CybersecurityConcept' && node.name) return String(node.name);
  if (node.label === 'CybersecurityTopic' && node.name) return String(node.name);
  if (node.label === 'ExampleVulnerability' && node.name) return String(node.name);
  if (node.label === 'Reference' && node.url) return String(node.url);
  if (node.label === 'Vendor' && node.name) return String(node.name);
  if (node.label === 'Component' && (node.name || node.cpe)) return String(node.name || node.cpe);
  if (node.label === 'Mitigation' && node.description) return String(node.description);
  if (node.label === 'CWE' && (node.id || node.description)) return String(node.id || node.description);
  if (node.label === 'Vulnerability' && node.cve_id) return String(node.cve_id);
  return String(node.name || node.id || '');
};

const getNodeTooltip = (node: Node) => {
  if (node.label === 'Query' && node.text) return node.text;
  if (node.label === 'CybersecurityConcept' && node.description) return node.description;
  if (node.label === 'CybersecurityTopic' && node.name) return `${node.name} (${node.category || 'Category'})`;
  if (node.label === 'ExampleVulnerability' && node.description) return node.description;
  if (node.label === 'Reference' && node.url) return node.url;
  if (node.label === 'Vendor' && node.name) return node.name;
  if (node.label === 'Component' && node.cpe) return node.cpe;
  if (node.label === 'Mitigation' && node.description) return node.description;
  if (node.label === 'CWE' && node.description) return node.description;
  if (node.label === 'Vulnerability' && node.description) return node.description;
  return getNodeDisplay(node);
};

const KGGraph = forwardRef<KGGraphHandle, KGGraphProps>(({ data, width = 1200, height = 0 }, ref) => {
  // Responsive height: 80vh by default
  const graphHeight = height && height > 0 ? height : Math.max(window.innerHeight * 0.8, 500);
  const graphWidth = width && width > 0 ? width : Math.max(window.innerWidth * 0.6, 600);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown> | null>(null);

  // Dynamically generate legend based on node types present
  const presentTypes = Array.from(new Set((data.nodes || []).map(n => n.label)));
  const legendData = presentTypes.map(type => ({ type, color: colorMap[type] || colorMap.Unknown }));

  // --- D3 Zoom Controls ---
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (svgRef.current && zoomRef.current) {
        (d3.select(svgRef.current) as any).call(zoomRef.current!.scaleBy, 1.2);
      }
    },
    zoomOut: () => {
      if (svgRef.current && zoomRef.current) {
        (d3.select(svgRef.current) as any).call(zoomRef.current!.scaleBy, 0.8);
      }
    },
    fitToView: () => {
      fitGraphToView();
    },
  }));

  // --- Fit graph to view ---
  const fitGraphToView = () => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    // Compute bounding box with extra padding
    const nodes = data.nodes;
    if (!nodes.length) return;
    const xs = nodes.map(n => n.x || 0);
    const ys = nodes.map(n => n.y || 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const pad = 80;
    const scale = 0.85 * Math.min((graphWidth - pad) / graphW, (graphHeight - pad) / graphH, 1);
    const tx = graphWidth / 2 - ((minX + maxX) / 2) * scale;
    const ty = graphHeight / 2 - ((minY + maxY) / 2) * scale;
    if (zoomRef.current) {
      (d3.select(svgRef.current) as any).call(zoomRef.current!.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
  };

  useEffect(() => {
    console.log("🎨 KGGraph received data:", data);
    console.log("📏 KGGraph dimensions:", { width, height });
    
    if (!data || !data.nodes || !data.links) {
      console.warn("⚠️  KGGraph: Missing data, nodes, or links");
      return;
    }
    
    console.log("🕸️  KGGraph: Nodes count:", data.nodes.length);
    console.log("🔗 KGGraph: Links count:", data.links.length);
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes: Node[] = data.nodes.map(n => ({ ...n }));
    const links: { source: string; target: string; label?: string }[] = data.links.map(l => ({ ...l }));

    console.log("🎯 KGGraph: Processed nodes:", nodes);
    console.log("🔗 KGGraph: Processed links:", links);

    // --- D3 Simulation ---
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2))
      .force("collision", d3.forceCollide().radius(48)); // Add collision force (node radius + padding)

    // --- D3 Zoom Setup ---
    const g = svg.append("g");
    gRef.current = g.node() as SVGGElement;
    zoomRef.current = d3.zoom<Element, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoomRef.current as any);

    // --- Draw links ---
    const link = g.append("g")
      .attr("stroke", "#b3b3b3")
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 2);

    // --- Draw nodes ---
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 32) // Larger node radius
      .attr("fill", d => colorMap[d.label] || colorMap.Unknown)
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on("mouseover", function (event: MouseEvent, d: Node) {
        d3.select(this as SVGCircleElement).attr("stroke", "#222").attr("stroke-width", 4);
        tooltip.style("display", "block")
          .html(`
            <div><strong>${d.name || d.label || d.id || "Node"}</strong></div>
            <div style="margin-top:4px;">${d.description || d.label || d.name || "No description available."}</div>
          `);
      })
      .on("mousemove", function (event: MouseEvent) {
        tooltip.style("left", (event.offsetX + 20) + "px")
          .style("top", (event.offsetY - 10) + "px");
      })
      .on("mouseout", function () {
        d3.select(this as SVGCircleElement).attr("stroke", "#fff").attr("stroke-width", 2);
        tooltip.style("display", "none");
      });

    // --- Draw node labels (use node.name, fallback to label or id) ---
    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2.4em") // Offset label below node center
      .attr("fill", "#222")
      .attr("font-size", 18)
      .attr("font-weight", 600)
      .attr("pointer-events", "none")
      .text((d: Node) => d.name || d.label || d.id || "Node");

    // --- Draw link labels (use link.label) ---
    g.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("fill", "#333")
      .attr("font-size", 14)
      .attr("text-anchor", "middle")
      .attr("x", (d: Link) => {
        const source = nodes.find(n => n.id === d.source);
        const target = nodes.find(n => n.id === d.target);
        return source && target ? ((source.x || 0) + (target.x || 0)) / 2 : 0;
      })
      .attr("y", (d: Link) => {
        const source = nodes.find(n => n.id === d.source);
        const target = nodes.find(n => n.id === d.target);
        return source && target ? ((source.y || 0) + (target.y || 0)) / 2 : 0;
      })
      .text((d: Link) => d.label || "");

    // --- D3: Auto-fit the graph to the SVG area with extra padding ---
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as Node).x || 0)
        .attr("y1", (d: any) => (d.source as Node).y || 0)
        .attr("x2", (d: any) => (d.target as Node).x || 0)
        .attr("y2", (d: any) => (d.target as Node).y || 0);
      node
        .attr("cx", (d: Node) => d.x || 0)
        .attr("cy", (d: Node) => d.y || 0);
      label
        .attr("x", (d: Node) => d.x || 0)
        .attr("y", (d: Node) => d.y || 0);
    });

    // After simulation stabilizes, fit graph to SVG
    simulation.on("end", () => {
      fitGraphToView();
    });

    // Tooltip
    let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    const parent = svg.node()?.parentElement;
    if (parent) {
      tooltip = d3.select(parent)
        .append("div")
        .attr("id", "kg-tooltip")
        .style("position", "absolute")
        .style("display", "none")
        .style("background", "#fff")
        .style("color", "#222")
        .style("border", "1px solid #ccc")
        .style("border-radius", "8px")
        .style("padding", "8px 12px")
        .style("pointer-events", "none")
        .style("z-index", "10")
        .style("min-width", "220px")
        .style("font-size", "16px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.12)");
    }

    return () => {
      simulation.stop();
      if (tooltip) tooltip.remove();
    };
  }, [data, width, height]);

  return (
    <div style={{ position: "relative", width: graphWidth, height: graphHeight }}>
      <svg ref={svgRef} width={graphWidth} height={graphHeight} className="w-full h-full" />
      {/* Legend: horizontal bar at the bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255,255,255,0.98)",
          borderTop: "1px solid #ddd",
          borderRadius: "0 0 12px 12px",
          padding: "12px 24px 12px 24px",
          zIndex: 5,
          fontSize: 16,
          minWidth: 220,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <strong style={{ marginRight: 16 }}>Legend</strong>
        {legendData.map(({ type, color }) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 18 }}>
            <span style={{ background: color, width: 20, height: 20, borderRadius: "50%", display: "inline-block", border: "1.5px solid #aaa" }}></span>
            <span>{type}</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export default KGGraph; 