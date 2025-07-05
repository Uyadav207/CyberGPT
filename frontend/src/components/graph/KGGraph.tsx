import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Node {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
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

const KGGraph: React.FC<KGGraphProps> = ({ data, width = 500, height = 320 }) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    // Copy nodes and links to avoid mutating props
    const nodes: Node[] = data.nodes.map(n => ({ ...n }));
    const links: { source: string; target: string; label?: string }[] = data.links.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#b3b3b3")
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 22)
      .attr("fill", "#7156DB")
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
      );

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#fff")
      .attr("font-size", 14)
      .attr("pointer-events", "none")
      .text((d: Node) => d.label);

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

    // Optional: Add link labels
    svg.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("fill", "#333")
      .attr("font-size", 11)
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

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  return <svg ref={ref} width={width} height={height} className="w-full h-full" />;
};

export default KGGraph; 