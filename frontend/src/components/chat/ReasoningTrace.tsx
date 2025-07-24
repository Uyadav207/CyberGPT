import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight,
  Search, 
  Database, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface ReasoningStep {
  step: string;
  message: string;
}

interface ReasoningTraceProps {
  trace: ReasoningStep[];
  className?: string;
  durationSec?: number;
}

const getStepIcon = (step: string) => {
  const stepLower = step.toLowerCase();
  
  if (stepLower.includes('userintent') || stepLower.includes('user')) {
    return <Sparkles className="w-3 h-3" />;
  }
  if (stepLower.includes('search') || stepLower.includes('query')) {
    return <Search className="w-3 h-3" />;
  }
  if (stepLower.includes('database') || stepLower.includes('neo4j') || stepLower.includes('kg')) {
    return <Database className="w-3 h-3" />;
  }
  if (stepLower.includes('llm') || stepLower.includes('ai') || stepLower.includes('generate')) {
    return <Brain className="w-3 h-3" />;
  }
  if (stepLower.includes('success') || stepLower.includes('found') || stepLower.includes('complete') || stepLower.includes('enrich')) {
    return <CheckCircle className="w-3 h-3" />;
  }
  if (stepLower.includes('error') || stepLower.includes('fallback') || stepLower.includes('failed')) {
    return <AlertCircle className="w-3 h-3" />;
  }
  if (stepLower.includes('api') || stepLower.includes('nvd') || stepLower.includes('circl') || stepLower.includes('osv')) {
    return <Info className="w-3 h-3" />;
  }
  
  return <Clock className="w-3 h-3" />;
};

const createNarrativeMessage = (step: ReasoningStep, index: number, trace: ReasoningStep[]) => {
  const { step: stepType, message } = step;
  const stepLower = stepType.toLowerCase();
  
  // Create narrative messages that tell a story
  if (stepLower.includes('userintent')) {
    return `Explaining the concept and vulnerabilities of ${message.toLowerCase()} to provide a detailed overview.`;
  }
  
  if (stepLower.includes('nvd')) {
    if (message.includes('Found CVE')) {
      return `Found vulnerability ${message.split('CVE')[1]?.split(' ')[0] || 'CVE'} in the National Vulnerability Database.`;
    }
    if (message.includes('Searching')) {
      return `Searching for known security vulnerabilities related to this topic.`;
    }
    return message;
  }
  
  if (stepLower.includes('circl')) {
    if (message.includes('No CVEs found')) {
      return `Checked CIRCL database for additional vulnerability information.`;
    }
    return `Searching CIRCL database for more comprehensive vulnerability data.`;
  }
  
  if (stepLower.includes('osv')) {
    if (message.includes('No CVEs found')) {
      return `Checked OSV database for additional vulnerability information.`;
    }
    return `Searching OSV database for more comprehensive vulnerability data.`;
  }
  
  if (stepLower.includes('llm fallback')) {
    if (message.includes('Inserted')) {
      return `Used AI to suggest relevant vulnerabilities and mitigation strategies.`;
    }
    return `Enhancing search results with AI-powered analysis.`;
  }
  
  if (stepLower.includes('enrich')) {
    return `Gathered comprehensive information including vulnerability IDs, risk levels, and prevention strategies.`;
  }
  
  if (stepLower.includes('llm')) {
    return `Using AI to enhance the search and find the most relevant security information.`;
  }
  
  return message;
};

const getSearchTerms = (trace: ReasoningStep[]) => {
  const searchSteps = trace.filter(step => 
    step.step === 'NVD' && step.message.includes('Searching')
  );
  
  if (searchSteps.length > 0) {
    const terms = searchSteps.map(step => {
      const match = step.message.match(/keyword: (.+?)\)/);
      return match ? match[1] : '';
    }).filter(term => term);
    
    return terms.slice(0, 3); // Limit to 3 terms
  }
  
  return ['cybersecurity', 'vulnerabilities'];
};

const getSourceCount = (trace: ReasoningStep[]) => {
  const sources = trace.filter(step => 
    step.step === 'NVD' || step.step === 'CIRCL' || step.step === 'OSV' || step.step === 'LLM'
  );
  return sources.length;
};

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({ trace, className, durationSec }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  // Auto-collapse after 6 seconds like ChatGPT reasoning tab behaviour
  React.useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 6000);
    return () => clearTimeout(timer);
  }, [expanded]);

  if (!trace || trace.length === 0) return null;

  return (
    <div className={`w-full ${className ?? ""}`}>
      {/* Toggle Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-gray-700 dark:text-gray-200 text-sm font-medium mb-2 focus:outline-none"
      >
        <span>
          Thought for {durationSec !== undefined ? `${durationSec.toFixed(1)}s` : 'a moment'}
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ol
            key="timeline"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="relative border-l border-gray-200 dark:border-gray-700 ml-4 pl-6 space-y-3 sm:space-y-4 text-[13px] leading-relaxed"
          >
            {trace.map((step, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[18px] top-1.5 w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary-950" />
                <span className="text-gray-700 dark:text-gray-300">
                  {createNarrativeMessage(step, idx, trace)}
                </span>
              </li>
            ))}

            {/* Done item */}
            <li className="relative flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="absolute -left-[18px] top-1.5 w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary-950" />
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Done</span>
            </li>
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}; 