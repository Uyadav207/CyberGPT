import { useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";
import "../file/MarkdownViewer.css";

// Function to process jargon syntax in text content
const processJargonInText = (content: any): any => {
  if (typeof content === 'string') {
    const jargonRegex = /\[JARGON_HIGHLIGHT:([^|]+)\|([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;while ((match = jargonRegex.exec(content)) !== null) {// Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the jargon tooltip component
      const term = match[1].trim();
      const description = match[2].trim().replace(/&quot;/g, '"');
      
      // Only create tooltip if we have both term and description
      if (term && description) {
        parts.push(
          <TooltipProvider key={match.index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="jargon-highlight"
                  style={{
                    cursor: 'pointer',
                    fontWeight: '500',
                    padding: '0 4px',
                    borderRadius: '2px',
                    borderBottom: '1px dotted #3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#1e40af'
                  }}
                >
                  {term}
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg max-w-md">
                <div className="p-3">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">{term}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      } else {
        // If malformed, just show the term as plain text
        parts.push(term);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }return parts.length > 0 ? parts : content;
  }
  
  if (Array.isArray(content)) {
    return content.map((child, index) => (
      <span key={index}>{processJargonInText(child)}</span>
    ));
  }
  
  return content;
};

interface MarkdownViewerProps {
  content: string;
  isUser?: boolean;
}

const MarkdownViewer = ({ content, isUser = false }: MarkdownViewerProps) => {
  // Decode HTML entities in the content
  const decodeHTMLEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };
  
  // Clean up malformed jargon syntax
  const cleanJargonSyntax = (text: string) => {
    // Remove malformed jargon syntax that's missing descriptions
    return text
      .replace(/\[JARGON_HIGHLIGHT:([^|]+)\]/g, '$1') // Remove incomplete syntax without description
      .replace(/\[JARGON_HIGHLIGHT:([^|]+)\|\s*\]/g, '$1'); // Remove syntax with empty description
  };
  
  // Content is already preprocessed by the chat component
  const processedContent = cleanJargonSyntax(decodeHTMLEntities(content));

  // Debug logging for code block detection
  useEffect(() => {
    // Debug logging removed - keeping useEffect for potential future use
  }, [content]);

  return (
    <div className={`prose text-sm ${isUser ? 'prose-invert' : 'prose-gray'} max-w-none prose-pre:my-0 prose-pre:rounded-md prose-headings:mb-3 prose-headings:mt-4 prose-p:mb-3 prose-p:leading-relaxed prose-li:my-0 prose-li:leading-relaxed prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2 overflow-x-hidden break-words hyphens-auto w-full prose-p:break-words prose-li:break-words`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        skipHtml={false}
        components={{
          // Custom pre component to handle code blocks properly
          pre({ children, ...props }: any) {
            // Check if this pre is inside a paragraph (which would be invalid)
            return (
              <div className="my-4" {...props}>
                {children}
              </div>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeText = String(children).replace(/\n$/, '');
            
            if (!inline) {
              // For block code, just return the code element (pre is handled separately)
              return (
                <code 
                  className={`language-${language} block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto`}
                  style={{
                    fontSize: '0.95em',
                    lineHeight: '1.5',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    whiteSpace: 'pre-wrap',
                    display: 'block',
                  }}
                  {...props}
                >
                  {codeText}
                </code>
              );
            }
            
            return (
              <code
                className={`inline bg-sidebar-accent text-sidebar-foreground rounded px-1.5 py-0.5 text-sm font-mono border border-sidebar-border break-words`}
                {...props}
              >
                {children}
              </code>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-gray-900 dark:text-gray-100">{processJargonInText(children)}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-gray-800 dark:text-gray-200">{processJargonInText(children)}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-gray-800 dark:text-gray-200">{processJargonInText(children)}</h3>;
          },
          p({ children, ...props }: any) {
            return <p className="mb-3 leading-7 text-gray-700 dark:text-gray-300" {...props}>{processJargonInText(children)}</p>;
          },
          ul({ children }) {
            return <ul className="my-3 list-disc pl-6 space-y-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-3 list-decimal pl-6 space-y-2">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed text-gray-700 dark:text-gray-300">{processJargonInText(children)}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-4 ${isUser ? 'border-gray-500 bg-[#ffffff1a]' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'} pl-4 py-2 my-3 italic rounded-r text-gray-700 dark:text-gray-300`}>
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${isUser ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'} underline`}
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 max-w-full w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg table-auto">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className={`${isUser ? 'bg-[#ffffff1a]' : 'bg-gray-50 dark:bg-gray-800'}`}>{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-opacity-50 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider break-words text-gray-700 dark:text-gray-300">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-6 py-4 text-sm break-words text-gray-700 dark:text-gray-300">
                {children}
              </td>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
