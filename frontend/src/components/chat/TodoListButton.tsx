import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Loader2, EyeOff, ListTodo, Download, GripVertical, AlertTriangle, Shield, CheckCircle, Save, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Message } from '../../types/chats';
import { MoveTodoToSpaceDialog } from './MoveTodoToSpaceDialog';
import useStore from '../../store/store';

interface TodoItem {
  id: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  description?: string;
  completed: boolean;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  cvssScore: number;
  confidence: number;
  cveIds?: string[];
  affectedSystems?: string[];
  emoji?: string;
}

interface TodoList {
  id: string;
  title: string;
  description: string;
  items: TodoItem[];
  createdAt: number; // Timestamp from database
  // Note: messageId and chatId are stored separately as _messageId and _chatId
  // to avoid schema validation errors in Convex
}

interface TodoListButtonProps {
  message: Message;
  chatId: string;
  className?: string;
}

// Sortable Todo Item Component
const SortableTodoItem: React.FC<{
  item: TodoItem;
  index: number;
  onToggle: (itemId: string) => void;
  getPriorityColor: (priority: string) => string;
  getCategoryColor: (category: string) => string;
  getRiskColor: (riskLevel: string) => string;
  getCVSSColor: (score: number) => string;
}> = ({ item, index, onToggle, getPriorityColor, getCategoryColor, getRiskColor, getCVSSColor }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
      className={`p-4 sm:p-5 rounded-lg transition-all duration-200 bg-card border border-border text-foreground shadow-sm w-full max-w-full relative group
        ${item.completed ? 'opacity-80 bg-green-50 dark:bg-green-900/30' : ''}
        ${isDragging ? 'shadow-lg ring-2 ring-primary/20 z-20' : ''}
        hover:border-primary hover:ring-2 hover:ring-primary/60 hover:shadow-lg`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle for Reordering */}
        <div className="flex flex-col items-center gap-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded p-1 hover:bg-muted/60 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(item.id)}
            className={`h-6 w-6 p-0 rounded ${
              item.completed 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {item.completed ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 border-2 border-current rounded" />
            )}
          </Button>
        </div>
        
        <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                            <h4 className={`font-medium ${
                              item.completed 
                                ? 'line-through text-gray-500 dark:text-gray-400' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {index + 1}. {item.emoji} {item.task}
                            </h4>
            <Badge className={`text-xs bg-sidebar text-sidebar-foreground border border-border hover:bg-sidebar/90 hover:text-sidebar-foreground focus:ring-2 focus:ring-primary/20 transition-colors duration-150 ${getPriorityColor(item.priority)}`}>{item.priority}</Badge>
            <Badge className={`text-xs bg-sidebar text-sidebar-foreground border border-border hover:bg-sidebar/90 hover:text-sidebar-foreground focus:ring-2 focus:ring-primary/20 transition-colors duration-150 ${getCategoryColor(item.category)}`}>{item.category}</Badge>
          </div>
          
          {/* Risk and CVSS Information */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Badge className={`text-xs border bg-card text-foreground border-border hover:bg-card/90 hover:text-foreground focus:ring-2 focus:ring-primary/20 transition-colors duration-150 ${getRiskColor(item.riskLevel)}`}>Risk: {item.riskLevel.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className={`text-sm font-semibold ${getCVSSColor(item.cvssScore)}`}>
                CVSS: {item.cvssScore.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Confidence: {(item.confidence * 100).toFixed(0)}%
              </span>
              <Progress value={item.confidence * 100} className="w-16 h-2" />
            </div>
          </div>
          
          {/* CVE IDs and Affected Systems */}
          {(item.cveIds && item.cveIds.length > 0) || (item.affectedSystems && item.affectedSystems.length > 0) ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {item.cveIds && item.cveIds.map((cveId, idx) => (
                <Badge key={idx} variant="outline" className="text-xs bg-muted text-muted-foreground border border-border hover:bg-muted/90 hover:text-muted-foreground focus:ring-2 focus:ring-primary/20 transition-colors duration-150">{cveId}</Badge>
              ))}
              {item.affectedSystems && item.affectedSystems.map((system, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-muted text-muted-foreground border border-border hover:bg-muted/90 hover:text-muted-foreground focus:ring-2 focus:ring-primary/20 transition-colors duration-150">{system}</Badge>
              ))}
            </div>
          ) : null}
          
          {item.description && (
            <p className={`text-sm mb-3 ${
              item.completed 
                ? 'text-gray-400 dark:text-gray-500' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {item.description}
            </p>
          )}
          

        </div>
      </div>
    </motion.div>
  );
};

// DropIndicator component
const DropIndicator = ({ id }: { id: string }) => {
  const { isOver } = useDroppable({ id });
  return (
    <div
      className={`transition-all duration-150 h-0.5 flex items-center justify-center -my-1 ${isOver ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={!isOver}
    >
      <div className="w-full h-1.5 rounded bg-primary" />
    </div>
  );
};

// Add animation variants for staggered reveal
const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};
const itemVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
};

const TodoListButton: React.FC<TodoListButtonProps> = ({ message, chatId, className = '' }) => {
  console.log('[TodoListButton] Component rendered:', {
    messageSender: message.sender,
    messageId: message.id,
    chatId,
    hasMessage: !!message.message,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTodoList, setShowTodoList] = useState(false);
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedOrder, setLastSavedOrder] = useState<string[]>([]);
  const [lastSavedCompletionStatus, setLastSavedCompletionStatus] = useState<Array<{id: string, completed: boolean}>>([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  
  // Get user from store
  const user = useStore((state) => state.user);
  
  // Debug user state
  React.useEffect(() => {
    console.log('[TodoListButton] User state:', { user: !!user, userId: user?.id, hasUser: !!user });
  }, [user]);

  // Convex mutations and queries
  console.log('[TodoListButton] Initializing Convex actions and mutations...');
  console.log('[TodoListButton] API object:', api);
  console.log('[TodoListButton] generateTodoTasks API:', api?.generateTodoTasks);
  
  const generateTodoTasksAction = useAction(api.todoApi.generateTodoTasksOnDemand);
  const updateTodoListMutation = useMutation(api.todoApi.saveTodoList);
  const getTodoListFromChatMutation = useQuery(api.todoApi.getTodoListFromChat, { chatId, messageId: message.id || '' });
  const chatHistory = useQuery(api.chats.getChatHistory, { chatId });
  
  console.log('[TodoListButton] Convex actions initialized:', {
    generateTodoTasksAction: !!generateTodoTasksAction,
    updateTodoListMutation: !!updateTodoListMutation,
    getTodoListFromChatMutation: !!getTodoListFromChatMutation,
  });

  // Test Convex connection
  React.useEffect(() => {
    console.log('[TodoListButton] Testing Convex connection...');
    console.log('[TodoListButton] Convex action is available:', typeof generateTodoTasksAction === 'function');
    console.log('[TodoListButton] API object keys:', Object.keys(api));
    console.log('[TodoListButton] todoApi keys:', api?.todoApi ? Object.keys(api.todoApi) : 'No todoApi');
    console.log('[TodoListButton] Testing simple Convex call...');
    
    // Test if we can call the action (without actually calling it)
    if (typeof generateTodoTasksAction === 'function') {
      console.log('[TodoListButton] ✅ Convex action function is available and ready');
      console.log('[TodoListButton] 🔍 Full API structure:', {
        api: api,
        todoApi: api?.todoApi,
        generateTodoTasksAction: generateTodoTasksAction
      });
    } else {
      console.error('[TodoListButton] ❌ Convex action function is NOT available');
      console.error('[TodoListButton] Available API modules:', Object.keys(api));
      console.error('[TodoListButton] API structure:', api);
    }
  }, [generateTodoTasksAction, chatId, message.id]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

    const generateTodoList = async (forceRegenerate = false) => {
      console.log("🚨 [TodoListButton] GENERATE TODO LIST CALLED - This should appear when button is clicked!");
      console.log("🚨 [TodoListButton] Function execution started at:", new Date().toISOString());
      console.log('[TodoListButton] generateTodoList called with:', {
        messageSender: message.sender,
        chatId,
        messageId: message.id || '',
        hasMessage: !!message.message,
        forceRegenerate,
      });
      console.log("🚨 [TodoListButton] generateTodoList function is being executed!");
      console.log("🚨 [TodoListButton] CRITICAL DEBUG - Message object:", {
        id: message.id,
        sender: message.sender,
        message: message.message?.substring(0, 100) + '...',
        hasId: !!message.id,
        idType: typeof message.id,
        chatId: chatId,
        chatIdType: typeof chatId
      });

      if (message.sender !== 'ai') {
        console.log('[TodoListButton] Skipping TODO generation - not an AI message');
        return;
      }

    setIsGenerating(true);
    setError(null);

    try {
      // Log input data for debugging
      console.log('[TodoListButton] Input data for TODO generation:', {
        chatId,
        messageId: message.id || '',
        aiResponseLength: message.message?.length || 0,
        hasReasoningTrace: !!message.reasoningTrace,
        hasCveDescriptionsMap: !!message.cveDescriptionsMap,
        hasSourceLinks: !!message.sourceLinks,
        hasJargons: !!message.jargons,
        reasoningTraceKeys: message.reasoningTrace ? Object.keys(message.reasoningTrace) : [],
        cveDescriptionsMapKeys: message.cveDescriptionsMap ? Object.keys(message.cveDescriptionsMap) : [],
        sourceLinksCount: message.sourceLinks?.length || 0,
        jargonsCount: message.jargons?.length || 0,
      });

      // Always generate fresh TODO lists with the new diverse system
      console.log('[TodoListButton] Generating fresh TODO list with new diverse system...');

      // Generate new TODO list using LLM with KG context and retry mechanism
      console.log('[TodoListButton] Generating new diverse TODO list...');
      
      let result;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log("🚨 [TodoListButton] ABOUT TO CALL generateTodoTasksAction with params:", {
            chatId: chatId,
            messageId: message.id || '',
            hasChatId: !!chatId,
            hasMessageId: !!(message.id || ''),
            chatIdType: typeof chatId,
            messageIdType: typeof (message.id || ''),
            chatIdValue: chatId,
            messageIdValue: message.id || ''
          });
          console.log("🚨 [TodoListButton] CRITICAL - Message object details:", {
            messageId: message.id,
            messageSender: message.sender,
            messageLength: message.message?.length || 0,
            hasHumanInTheLoopId: !!message.humanInTheLoopId,
            humanInTheLoopId: message.humanInTheLoopId,
            messageIdMatchesHumanInTheLoopId: message.id === message.humanInTheLoopId
          });
          // Use humanInTheLoopId if available, otherwise fall back to message.id
          const messageIdToUse = message.humanInTheLoopId || message.id || '';
          console.log("🚨 [TodoListButton] FIX - Using correct messageId for TODO generation:", {
            originalMessageId: message.id || '',
            humanInTheLoopId: message.humanInTheLoopId || '',
            finalMessageId: messageIdToUse,
            usingHumanInTheLoopId: !!message.humanInTheLoopId
          });
          
          console.log("🚨 [TodoListButton] CALLING generateTodoTasksAction NOW...");
          console.log("🚨 [TodoListButton] Function check:", {
            generateTodoTasksAction: typeof generateTodoTasksAction,
            isFunction: typeof generateTodoTasksAction === 'function',
            functionName: generateTodoTasksAction?.name
          });
          
          // Get the user question from the chat history
          const userQuestion = chatHistory ? (() => {
            // Find the user message that corresponds to this AI response
            const userMessages = chatHistory.filter((msg: any) => msg.sender === 'user');
            // Get the most recent user message before this AI response
            const question = userMessages[userMessages.length - 1]?.message || 'Security analysis request';
            console.log('[TodoListButton] Extracted user question:', {
              question: question,
              userMessagesCount: userMessages.length,
              chatHistoryLength: chatHistory.length
            });
            return question;
          })() : 'Security analysis request';

          const apiParams = {
            chatId: chatId,
            messageId: messageIdToUse,
            userQuestion: userQuestion,
            aiResponse: message.message || '',
            kgContext: message.reasoningTrace ? JSON.stringify(message.reasoningTrace) : undefined,
            cveInfo: message.cveDescriptionsMap ? {
              cve_id: Object.keys(message.cveDescriptionsMap)[0],
              cve_desc: Object.values(message.cveDescriptionsMap)[0],
            } : undefined,
            reasoningTrace: message.reasoningTrace,
            sourceLinks: message.sourceLinks,
            jargons: message.jargons,
          };
          
          console.log("🚨 [TodoListButton] API Parameters:", apiParams);
          console.log("🚨 [TodoListButton] About to call generateTodoTasksAction with params:", apiParams);

          result = await generateTodoTasksAction(apiParams);
          console.log("🚨 [TodoListButton] generateTodoTasksAction COMPLETED!");
          
          // If successful, break out of retry loop
          break;
        } catch (error) {
          retryCount++;
          console.log(`[TodoListButton] TODO generation attempt ${retryCount} failed:`, error);
          
          if (retryCount >= maxRetries) {
            throw error; // Re-throw if max retries reached
          }
          
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`[TodoListButton] Waiting ${delay}ms before retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log('[TodoListButton] generateTodoTasksAction result:', {
        success: result.success,
        hasTodoList: !!result.todoList,
        todoListId: result.todoList?.id,
        itemsCount: result.todoList?.items?.length || 0,
        message: result.message,
      });

              if (result.success && result.todoList) {
          console.log('[TodoListButton] Generated TODO list successfully:', {
            todoListId: result.todoList.id,
            title: result.todoList.title,
            itemsCount: result.todoList.items.length,
            items: result.todoList.items.map((item: TodoItem) => ({
              id: item.id,
              task: item.task.substring(0, 50) + '...',
              priority: item.priority,
              category: item.category,
              emoji: item.emoji,
            })),
          });
          
          // Store the correct messageId separately (not in the todoList object)
          const correctMessageId = message.humanInTheLoopId || message.id || '';
          const todoListWithIds = {
            ...result.todoList,
            // Store messageId and chatId as separate properties for internal use
            _messageId: correctMessageId,
            _chatId: chatId
          };
          
          // Create a clean version without the extra fields for state
          const cleanTodoList = {
            ...result.todoList
          };
          
          console.log('[TodoListButton] TODO list with IDs:', {
            todoListId: todoListWithIds.id,
            messageId: todoListWithIds._messageId,
            chatId: todoListWithIds._chatId,
            hasMessageId: !!todoListWithIds._messageId,
            hasChatId: !!todoListWithIds._chatId
          });
          
          setTodoList(cleanTodoList);
          setLastSavedOrder(cleanTodoList.items.map((item: TodoItem) => item.id));
          setLastSavedCompletionStatus(cleanTodoList.items.map((item: TodoItem) => ({ id: item.id, completed: item.completed })));
          setShowTodoList(true);
          
          console.log('[TodoListButton] TODO list state updated successfully');
        } else {
        console.error('[TodoListButton] Failed to generate TODO list:', result);
        throw new Error('Failed to generate TODO list');
      }
      
    } catch (err) {
      console.error('[TodoListButton] Error generating TODO list:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate TODO list';
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('Chat history entry not found')) {
        setError('TODO list generation failed. Please try again.');
      } else if (errorMessage.includes('setTimeout')) {
        setError('TODO list generation failed. Please try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTodoList = () => {
    console.log('[TodoListButton] toggleTodoList called:', {
      hasTodoList: !!todoList,
      showTodoList,
      messageSender: message.sender,
      messageId: message.id,
      chatId,
    });

    if (showTodoList) {
      console.log('[TodoListButton] Hiding TODO list');
      setShowTodoList(false);
    } else {
      // Always generate fresh, response-specific TODO lists
      console.log('[TodoListButton] Generating fresh response-specific TODO list...');
      console.log('[TodoListButton] About to call generateTodoList function');
      console.log('[TodoListButton] generateTodoList function exists:', typeof generateTodoList === 'function');
      generateTodoList(true); // Force regenerate with response-specific content
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && todoList) {
      const oldIndex = todoList.items.findIndex(item => item.id === active.id);
      const newIndex = todoList.items.findIndex(item => item.id === over?.id);

      setTodoList(prev => {
        if (!prev) return prev;
        const newItems = arrayMove(prev.items, oldIndex, newIndex);
        
        // Auto-save the new order (prev should be clean without extra fields)
        autoSaveTodoList({
          ...prev,
          items: newItems
        });
        
        return {
          ...prev,
          items: newItems
        };
      });
    }
  };

  const autoSaveTodoList = async (updatedTodoList: TodoList) => {
    console.log('[TodoListButton] autoSaveTodoList called with:', {
      hasUpdatedTodoList: !!updatedTodoList,
      hasChatId: !!chatId,
      todoListId: updatedTodoList?.id,
      itemsCount: updatedTodoList?.items?.length || 0,
    });

    if (!updatedTodoList || !chatId) {
      console.log('[TodoListButton] Skipping auto-save - missing data');
      return;
    }
    
    // Check if order has changed
    const currentOrder = updatedTodoList.items.map(item => item.id);
    const orderHasChanged = JSON.stringify(currentOrder) !== JSON.stringify(lastSavedOrder);
    
    // Check if completion status has changed
    const currentCompletionStatus = updatedTodoList.items.map(item => ({ id: item.id, completed: item.completed }));
    const completionHasChanged = JSON.stringify(currentCompletionStatus) !== JSON.stringify(lastSavedCompletionStatus);
    
    console.log('[TodoListButton] Change detection:', {
      currentOrder,
      lastSavedOrder,
      orderHasChanged,
      currentCompletionStatus,
      lastSavedCompletionStatus,
      completionHasChanged,
    });

    if (!orderHasChanged && !completionHasChanged) {
      console.log('[TodoListButton] No changes detected, skipping save');
      return; // No change, don't save
    }

    setIsSaving(true);
    try {
      console.log('[TodoListButton] Calling updateTodoListMutation...');
      console.log("🚨 [TodoListButton] AUTO-SAVE DEBUG - Parameters being passed:", {
        chatId: chatId,
        messageId: message.id || '',
        hasChatId: !!chatId,
        hasMessageId: !!(message.id || ''),
        chatIdType: typeof chatId,
        messageIdType: typeof (message.id || ''),
        chatIdValue: chatId,
        messageIdValue: message.id || '',
        todoListId: updatedTodoList?.id,
        itemsCount: updatedTodoList?.items?.length || 0
      });
      
            // Add retry mechanism for auto-save
      let retryCount = 0;
      const maxRetries = 2;
      let result;
      
      while (retryCount < maxRetries) {
        try {
                console.log("🚨 [TodoListButton] AUTO-SAVE DEBUG - Message IDs:", {
        messageId: message.id || '',
        humanInTheLoopId: message.humanInTheLoopId || '',
        chatId: chatId,
        doMessageIdsMatch: message.id === message.humanInTheLoopId
      });
          
          // Use the messageId from the message object since todoList is now clean
          const messageIdToUse = message.humanInTheLoopId || message.id || '';
          console.log("🚨 [TodoListButton] AUTO-SAVE FIX - Using messageId:", {
            originalMessageId: message.id || '',
            humanInTheLoopId: message.humanInTheLoopId || '',
            finalMessageId: messageIdToUse,
            usingHumanInTheLoopId: !!message.humanInTheLoopId
          });
          
          // Validate that we have the correct messageId
          if (!messageIdToUse) {
            console.error("🚨 [TodoListButton] CRITICAL ERROR - No messageId available for auto-save!");
            throw new Error("No messageId available for auto-save");
          }
          
          console.log("🚨 [TodoListButton] ABOUT TO CALL updateTodoListMutation - Function check:", {
            functionName: updateTodoListMutation.name,
            functionType: typeof updateTodoListMutation,
            isFunction: typeof updateTodoListMutation === 'function'
          });
          
                // Remove extra fields that are not allowed by the schema
      const { chatId: todoListChatId, messageId: todoListMessageId, ...cleanTodoList } = updatedTodoList as any;
      
      console.log("🚨 [TodoListButton] CLEANING TODO LIST - Removed extra fields:", {
        originalKeys: Object.keys(updatedTodoList),
        cleanedKeys: Object.keys(cleanTodoList),
        removedFields: ['chatId', 'messageId']
      });
      
      result = await updateTodoListMutation({
        chatId,
        messageId: messageIdToUse,
        todoList: cleanTodoList,
      });
          
          // If successful, break out of retry loop
          break;
        } catch (error) {
          retryCount++;
          console.log(`[TodoListButton] Auto-save attempt ${retryCount} failed:`, error);
          
          if (retryCount >= maxRetries) {
            throw error; // Re-throw if max retries reached
          }
          
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s
          console.log(`[TodoListButton] Waiting ${delay}ms before auto-save retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      console.log('[TodoListButton] updateTodoListMutation result:', result);
      setLastSavedOrder(currentOrder);
      setLastSavedCompletionStatus(currentCompletionStatus);
      console.log('[TodoListButton] Auto-saved TODO list changes successfully');
      
      // Show success message briefly
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error('[TodoListButton] Failed to auto-save TODO list:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    if (!todoList) return;
    
    console.log('[TodoListButton] handleToggleItem called for itemId:', itemId);
    console.log("🚨 [TodoListButton] TOGGLE DEBUG - Current state:", {
      todoListId: todoList?.id,
      messageId: message.id || '',
      humanInTheLoopId: message.humanInTheLoopId || '',
      chatId: chatId,
      doMessageIdsMatch: message.id === message.humanInTheLoopId,
      itemToToggle: itemId
    });
    
    setTodoList(prev => {
      if (!prev) return prev;
      const updatedItems = prev.items.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      
      const updatedTodoList = {
        ...prev,
        items: updatedItems
      };
      
      console.log('[TodoListButton] Item completion toggled, triggering auto-save...');
      
      // Auto-save when items are toggled
      autoSaveTodoList(updatedTodoList);
      
      return updatedTodoList;
    });
  };

  const downloadAsPDF = async () => {
    if (!todoList) return;
    
    setIsDownloading(true);
    try {
      // Create PDF content
      const pdfContent = `
        <html>
          <head>
            <title>Security TODO List - ${todoList.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
              .completed { background-color: #f8f9fa; text-decoration: line-through; }
              .priority-high { border-left: 4px solid #dc3545; }
              .priority-medium { border-left: 4px solid #ffc107; }
              .priority-low { border-left: 4px solid #28a745; }
              .risk-critical { background-color: #f8d7da; }
              .risk-high { background-color: #fff3cd; }
              .risk-medium { background-color: #d1ecf1; }
              .risk-low { background-color: #d4edda; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin: 2px; }
              .cvss-score { font-weight: bold; color: #dc3545; }
              .confidence { color: #6c757d; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${todoList.title}</h1>
              <p>${todoList.description}</p>
              <p>Generated on: ${new Date(todoList.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="summary">
              <h3>Summary</h3>
              <p>Total Items: ${todoList.items.length}</p>
              <p>Completed: ${todoList.items.filter(item => item.completed).length}</p>
              <p>High Priority: ${todoList.items.filter(item => item.priority === 'high').length}</p>
              <p>Critical Risk: ${todoList.items.filter(item => item.riskLevel === 'critical').length}</p>
            </div>
            
            <h3>Action Items</h3>
            ${todoList.items.map((item, index) => `
              <div class="item ${item.completed ? 'completed' : ''} priority-${item.priority} risk-${item.riskLevel}">
                <h4>${index + 1}. ${item.task}</h4>
                <p><strong>Priority:</strong> <span class="badge priority-${item.priority}">${item.priority.toUpperCase()}</span></p>
                <p><strong>Category:</strong> <span class="badge">${item.category}</span></p>
                <p><strong>Risk Level:</strong> <span class="badge risk-${item.riskLevel}">${item.riskLevel.toUpperCase()}</span></p>
                <p><strong>CVSS Score:</strong> <span class="cvss-score">${item.cvssScore.toFixed(1)}</span></p>
                <p><strong>Confidence:</strong> <span class="confidence">${(item.confidence * 100).toFixed(0)}%</span></p>
                ${item.cveIds && item.cveIds.length > 0 ? `<p><strong>CVE IDs:</strong> ${item.cveIds.join(', ')}</p>` : ''}
                ${item.affectedSystems && item.affectedSystems.length > 0 ? `<p><strong>Affected Systems:</strong> ${item.affectedSystems.join(', ')}</p>` : ''}
                ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}

              </div>
            `).join('')}
          </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-todo-list-${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('[TodoListButton] Error downloading PDF:', err);
      setError('Failed to download TODO list');
    } finally {
      setIsDownloading(false);
    }
  };

  // Update color utility functions to use theme tokens
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Security': return 'bg-primary/10 text-primary border border-primary/20';
      case 'Updates': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800';
      case 'Configuration': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-800';
      case 'Monitoring': return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800';
      case 'Testing': return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-800';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'high': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getCVSSColor = (score: number) => {
    if (score >= 9.0) return 'text-destructive';
    if (score >= 7.0) return 'text-orange-600 dark:text-orange-400';
    if (score >= 4.0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Only show for AI messages
  if (message.sender !== 'ai') {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Debug Test Button */}
      <Button
        onClick={() => {
          console.log('[TodoListButton] DEBUG TEST BUTTON CLICKED');
          console.log('[TodoListButton] API structure:', api);
          console.log('[TodoListButton] todoApi:', api?.todoApi);
          console.log('[TodoListButton] generateTodoTasksAction:', generateTodoTasksAction);
          console.log('[TodoListButton] typeof generateTodoTasksAction:', typeof generateTodoTasksAction);
        }}
        variant="outline"
        size="sm"
        className="mr-2 text-xs"
      >
        Debug API
      </Button>
      
      {/* TODO List Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('[TodoListButton] Button clicked!', {
                messageSender: message.sender,
                messageId: message.id,
                isGenerating,
                showTodoList,
              });
              console.log('[TodoListButton] Convex client status:', {
                apiExists: !!api,
                generateTodoTasksActionExists: !!generateTodoTasksAction,
              });
              console.log('[TodoListButton] About to call toggleTodoList...');
              toggleTodoList();
            }}
            disabled={isGenerating}
            className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
              showTodoList 
                ? 'bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent/80' 
                : 'hover:bg-sidebar-accent'
            }`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showTodoList ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <ListTodo className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isGenerating 
            ? 'Generating TODO list...' 
            : showTodoList 
              ? 'Hide TODO list' 
              : 'Generate TODO list'
          }
        </TooltipContent>
      </Tooltip>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400 max-w-xs z-50"
          >
            <div className="mb-2">{error}</div>
            <Button
              onClick={() => {
                setError(null);
                generateTodoList();
              }}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TODO List Modal */}
      <Dialog open={showTodoList} onOpenChange={setShowTodoList}>
        <DialogContent className="max-w-4xl w-full sm:max-w-3xl h-[80vh] p-0 bg-background text-foreground border border-border rounded-lg overflow-hidden flex flex-col">
          {todoList && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center justify-between">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex items-center gap-2 min-w-0 flex-shrink"
                  >
                    <CheckSquare className="h-5 w-5" />
                    <DialogTitle className="truncate">{todoList.title}</DialogTitle>
                  </motion.div>
                  <div className="flex flex-row flex-wrap gap-x-2 gap-y-2 items-center justify-end min-w-0">
                    {isSaving && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    )}
                    {showSaveSuccess && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Saved!</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          console.log('[TodoListButton] Regenerate TODO list clicked');
                          generateTodoList(true); // Force regenerate with response-specific content
                        }}
                        disabled={isGenerating}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('[TodoListButton] Move to My Space clicked', { user: !!user, userId: user?.id });
                          setShowMoveDialog(true);
                        }}
                        disabled={false} // Temporarily enable for debugging
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Move to My Space {!user ? '(No User)' : ''}
                      </Button>
                      <Button
                        onClick={downloadAsPDF}
                        disabled={isDownloading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isDownloading ? 'Generating...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {todoList.description}
                </p>
              </DialogHeader>
              
              <ScrollArea className="flex-1 p-3 sm:p-6 bg-background min-h-0 scroll-smooth overscroll-behavior-contain scroll-behavior-smooth">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={todoList.items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence>
                      <motion.div
                        className="space-y-2 pt-4 pb-4"
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                      >
                        {todoList.items.map((item, index) => (
                          <React.Fragment key={item.id}>
                            <DropIndicator id={`drop-${item.id}-before`} />
                            <motion.div variants={itemVariants}>
                              <SortableTodoItem
                                item={item}
                                index={index}
                                onToggle={handleToggleItem}
                                getPriorityColor={getPriorityColor}
                                getCategoryColor={getCategoryColor}
                                getRiskColor={getRiskColor}
                                getCVSSColor={getCVSSColor}
                              />
                            </motion.div>
                          </React.Fragment>
                        ))}
                        <DropIndicator id={`drop-end`} />
                      </motion.div>
                    </AnimatePresence>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
              
              <div className="p-4 sm:p-6 border-t border-border bg-sidebar flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sidebar-foreground font-medium">
                        {todoList.items.filter(item => item.completed).length} of {todoList.items.length} completed
                      </span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-sidebar-foreground/30" />
                    <span className="text-sidebar-foreground/70">
                      {Math.round((todoList.items.filter(item => item.completed).length / todoList.items.length) * 100)}% done
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sidebar-foreground/60">
                    <span className="text-xs">Created</span>
                    <span className="text-sidebar-foreground font-medium">
                      {new Date(todoList.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Move to My Space Dialog */}
      {user && (
        <MoveTodoToSpaceDialog
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
          todoList={todoList}
          userId={user.id}
          onSuccess={() => {
            console.log('TODO list saved to My Space successfully');
            // Toast notification is handled by MoveTodoToSpaceDialog component
          }}
        />
      )}
    </div>
  );
};

export default TodoListButton; 