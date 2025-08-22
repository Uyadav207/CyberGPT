import {useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";
import "../file/MarkdownViewer.css";

interface MarkdownViewerProps {
  content: string;
  isUser?: boolean;
}

const MarkdownViewer = ({ content, isUser = false }: MarkdownViewerProps) => {
  // Debug logging for code block detection
  useEffect(() => {
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    console.log('MarkdownViewer content analysis:', {
      contentLength: content.length,
      hasCodeBlocks: content.includes('```'),
      codeBlockCount: codeBlockCount,
      sampleContent: content.substring(0, 200)
    });
  }, [content]);

  return (
    <div className={`prose text-sm ${isUser ? 'prose-invert' : 'prose-gray'} max-w-none prose-pre:my-0 prose-pre:rounded-md prose-headings:mb-3 prose-p:mb-3 prose-p:leading-relaxed prose-li:my-0 prose-li:leading-relaxed`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeText = String(children).replace(/\n$/, '');
            
            return !inline ? (
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '0.5rem',
                  borderRadius: 0,
                  background: 'transparent',
                  fontSize: '0.95em',
                  lineHeight: '1.5',
                  color: 'hsl(var(--sidebar-foreground))',
                  border: 'none',
                  boxShadow: 'none',
                }}
                PreTag="div"
                {...props}
              >
                {codeText}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`inline whitespace-nowrap bg-sidebar-accent text-sidebar-foreground rounded px-1.5 py-0.5 text-sm font-mono border border-sidebar-border`}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3 leading-7">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-3 list-disc pl-6 space-y-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-3 list-decimal pl-6 space-y-2">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-4 ${isUser ? 'border-gray-500 bg-[#ffffff1a]' : 'border-gray-200 bg-gray-50'} pl-4 py-2 my-3 italic rounded-r`}>
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
              <div className="overflow-x-auto my-3">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className={`${isUser ? 'bg-[#ffffff1a]' : 'bg-gray-50'}`}>{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-gray-200">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-opacity-50 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {children}
              </td>
            );
          },
          span({ className, children, ...props }: any) {
            // Handle jargon highlights with tooltips
            if (className && className.includes('jargon-highlight')) {
              const term = props['data-term'];
              const description = props['data-description'];
              
              if (term && description) {
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span 
                          className={`${className} bg-blue-100 dark:bg-sidebar text-blue-800 dark:text-sidebar-foreground border border-blue-200 dark:border-sidebar-border rounded px-1.5 py-0.5 font-medium hover:bg-blue-200 dark:hover:bg-sidebar-accent transition-colors duration-200`}
                          style={{ cursor: 'pointer' }}
                          {...props}
                        >
                          {children}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-200 dark:border-gray-700 shadow-md">
                        <div className="text-xs leading-relaxed">{description}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
            }
            
            // Default span rendering
            return <span className={className} {...props}>{children}</span>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
