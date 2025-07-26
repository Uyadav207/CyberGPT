import React, { useState, useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import { Check, Copy } from 'lucide-react';
import "../file/MarkdownViewer.css";

interface MarkdownViewerProps {
  content: string;
  isUser?: boolean;
}

const MarkdownViewer = ({ content, isUser = false }: MarkdownViewerProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

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
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
            
            return !inline ? (
              <div className="relative group my-4">
                {/* Code block header with language and copy button */}
                <div className="flex items-center justify-between bg-sidebar border border-sidebar-border px-4 py-2 rounded-t-md">
                  <span className="text-xs font-medium text-sidebar-foreground uppercase tracking-wide">
                    {language}
                  </span>
                  <button
                    onClick={() => copyToClipboard(codeText, codeId)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded"
                  >
                    {copiedCode === codeId ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                
                {/* Code content */}
                <div className="rounded-b-md overflow-hidden bg-sidebar border border-sidebar-border border-t-0">
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'hsl(var(--sidebar-background))',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      color: 'hsl(var(--sidebar-foreground))',
                    }}
                    PreTag="div"
                    {...props}
                  >
                    {codeText}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <code
                className={`bg-sidebar-accent text-sidebar-foreground rounded px-1.5 py-0.5 text-sm font-mono border border-sidebar-border`}
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
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
