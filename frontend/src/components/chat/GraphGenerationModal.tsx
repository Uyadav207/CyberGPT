import React, { useState, useEffect } from 'react';
import { Loader2, Network, GitBranch, Link, Sparkles, CheckCircle } from 'lucide-react';

interface GraphGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  progress?: number; // Progress from 0 to 100
  currentStep?: number; // Current step index (0-5)
}

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
  completed: boolean;
  active: boolean;
}

const GraphGenerationModal: React.FC<GraphGenerationModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  progress: externalProgress,
  currentStep: externalCurrentStep,
}) => {
  const [currentStep, setCurrentStep] = useState(externalCurrentStep || 0);
  const [progress, setProgress] = useState(externalProgress || 0);

  console.log("🚀 [GraphGenerationModal] Component rendered:", { isOpen });

  const steps: ProgressStep[] = [
    {
      id: 'analyzing',
      title: 'Analyzing Response',
      description: 'Extracting key concepts and entities from your answer',
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      emoji: '🔍',
      completed: false,
      active: false,
    },
    {
      id: 'extracting',
      title: 'Extracting Entities',
      description: 'Identifying vulnerabilities, mitigations, and sources',
      icon: <Network className="w-6 h-6" />,
      emoji: '🎯',
      completed: false,
      active: false,
    },
    {
      id: 'querying',
      title: 'Querying Knowledge Graph',
      description: 'Fetching related data from cybersecurity database',
      icon: <GitBranch className="w-6 h-6" />,
      emoji: '🗄️',
      completed: false,
      active: false,
    },
    {
      id: 'relationships',
      title: 'Creating Relationships',
      description: 'Building connections between entities and concepts',
      icon: <Link className="w-6 h-6" />,
      emoji: '🔗',
      completed: false,
      active: false,
    },
    {
      id: 'visualizing',
      title: 'Building Visualization',
      description: 'Generating interactive graph structure',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '✨',
      completed: false,
      active: false,
    },
    {
      id: 'finalizing',
      title: 'Finalizing Graph',
      description: 'Optimizing layout and preparing for display',
      icon: <CheckCircle className="w-6 h-6" />,
      emoji: '🎉',
      completed: false,
      active: false,
    },
  ];

  // Update local state when external props change
  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
    }
  }, [externalProgress]);

  useEffect(() => {
    if (externalCurrentStep !== undefined) {
      setCurrentStep(externalCurrentStep);
    }
  }, [externalCurrentStep]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // If external progress is provided, don't use internal timer
    if (externalProgress !== undefined || externalCurrentStep !== undefined) {
      return;
    }

    // Fallback to internal timer if no external progress provided
    const stepDuration = 8000; // 8 seconds per step
    const totalDuration = stepDuration * steps.length;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / totalDuration) * 100;
        return Math.min(newProgress, 100);
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        if (nextStep >= steps.length) {
          clearInterval(stepInterval);
          clearInterval(progressInterval);
          // Auto-close after completion
          setTimeout(() => {
            onClose();
          }, 2000);
          return prev;
        }
        return nextStep;
      });
    }, stepDuration);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen, onClose, steps.length, externalProgress, externalCurrentStep]);

  const getCurrentStep = () => {
    return steps[currentStep] || steps[0];
  };

  const getCompletedSteps = () => {
    return steps.slice(0, currentStep);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                <Network className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Building Knowledge Graph
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Creating an interactive visualization of your cybersecurity insights
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Current Step */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700 transition-all duration-300">
                <div className="text-3xl animate-pulse">
                  {getCurrentStep().emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    {getCurrentStep().icon}
                    <span className="ml-2">{getCurrentStep().title}</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {getCurrentStep().description}
                  </p>
                </div>
              </div>
            </div>

            {/* Completed Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Completed Steps:
              </h4>
              {getCompletedSteps().map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {step.emoji} {step.title}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fun Facts */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700 transition-all duration-500">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Did You Know?
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-300 transition-all duration-300">
                {currentStep === 0 && "🔍 Analyzing every word to identify cybersecurity entities"}
                {currentStep === 1 && "🎯 AI can indentifying different types of security vulnerabilities"}
                {currentStep === 2 && "🗄️ Querying a database of CVEs and security concepts"}
                {currentStep === 3 && "🔗 Creating intelligent relationships between security concepts"}
                {currentStep === 4 && "✨ Each graph is uniquely generated for specific question"}
                {currentStep === 5 && "🎉 Personalized cybersecurity knowledge graph is ready!"}
              </p>flow
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                console.log("🚫 [GraphGenerationModal] Cancel button clicked");
                if (onCancel) {
                  onCancel();
                } else {
                  onClose();
                }
              }}
              className="w-full mt-6 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Cancel Generation
            </button>
          </div>
        </div>
  );
};

export default GraphGenerationModal;
