import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink, Shield, BookOpen, Database } from 'lucide-react';

interface SourceLink {
  title: string;
  url: string;
  type: 'official' | 'reference' | 'framework';
}

interface SourceLinksProps {
  sourceLinks: SourceLink[];
  className?: string;
}

const getSourceIcon = (type: string) => {
  switch (type) {
    case 'official':
      return <Shield className="w-3 h-3 text-green-600" />;
    case 'reference':
      return <BookOpen className="w-3 h-3 text-blue-600" />;
    case 'framework':
      return <Database className="w-3 h-3 text-purple-600" />;
    default:
      return <ExternalLink className="w-3 h-3 text-gray-600" />;
  }
};

const getSourceTypeColor = (type: string) => {
  switch (type) {
    case 'official':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'reference':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'framework':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const SourceLinks: React.FC<SourceLinksProps> = ({ sourceLinks, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sourceLinks || sourceLinks.length === 0) {
    return null;
  }

  // Group sources by type
  const groupedSources = sourceLinks.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = [];
    }
    acc[source.type].push(source);
    return acc;
  }, {} as Record<string, SourceLink[]>);

  const typeOrder = ['official', 'reference', 'framework'];
  const sortedTypes = typeOrder.filter(type => groupedSources[type]);

  return (
    <div className={`mt-3 ${className}`}>
      <div className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Sources ({sourceLinks.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200"
            >
              <div className="p-3 space-y-3">
                {sortedTypes.map((type) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(type)}
                      <span className={`text-xs px-2 py-1 rounded-full border ${getSourceTypeColor(type)}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-1 ml-5">
                      {groupedSources[type].map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline group transition-colors"
                        >
                          <span className="truncate">{source.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Footer */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 italic">
                    Click any link to verify information from trusted cybersecurity sources
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 