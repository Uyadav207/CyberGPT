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

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({ trace, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!trace || trace.length === 0) {
    return null;
  }

  // Filter out redundant steps and create narrative
  const narrativeSteps = trace
    .filter((step, index) => {
      // Remove duplicate NVD searches
      if (step.step === 'NVD' && step.message.includes('Searching')) {
        const prevSteps = trace.slice(0, index);
        return !prevSteps.some(s => s.step === 'NVD' && s.message.includes('Searching'));
      }
      return true;
    })
    .map((step, index) => ({
      ...step,
      narrativeMessage: createNarrativeMessage(step, index, trace)
    }));

  const searchTerms = getSearchTerms(trace);
  const sourceCount = getSourceCount(trace);

  return (
    <div className={`mt-4 ${className}`}>
      {/* Collapsible Header */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 w-full text-left"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Clock className="w-4 h-4" />
        <span className="font-medium">
          How I found this information ({narrativeSteps.length} steps)
        </span>
      </motion.button>
      
      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="mt-3 space-y-4 overflow-hidden"
          >
            {/* Main Objective */}
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700">
                {narrativeSteps.find(step => step.step.toLowerCase().includes('userintent'))?.narrativeMessage || 
                 'Explaining the concept and vulnerabilities to provide a detailed overview.'}
              </p>
            </div>

            {/* Searching Section */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Searching</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {searchTerms.map((term, index) => (
                  <div key={index} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                    <Search className="w-3 h-3" />
                    <span>{term}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Sources */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Reading sources</span>
                <span className="text-xs text-gray-500">· {sourceCount}</span>
              </div>
              
              <div className="pl-6 space-y-2">
                {narrativeSteps
                  .filter(step => 
                    step.step === 'NVD' || step.step === 'CIRCL' || step.step === 'OSV' || 
                    step.step === 'LLM' || step.step === 'LLM Fallback'
                  )
                  .map((step, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                      <p className="text-sm text-gray-600">
                        {step.narrativeMessage}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Finished */}
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 font-medium">Finished</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 