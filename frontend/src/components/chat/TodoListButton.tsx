import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Loader2, Eye, EyeOff, ListTodo, Download, GripVertical, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
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
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Message } from '../../types/chats';

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
      initial={{ opacity: 0, x: -20, y: 10 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        scale: isDragging ? 1.02 : 1,
        rotateZ: isDragging ? 1 : 0
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
      whileHover={{ 
        scale: isDragging ? 1.02 : 1.01,
        y: isDragging ? 0 : -2
      }}
      className={`p-4 border rounded-lg transition-all duration-200 ${
        item.completed 
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
      } ${isDragging ? 'shadow-2xl scale-105 ring-2 ring-blue-500 ring-opacity-50' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle for Reordering */}
        <div className="flex flex-col items-center gap-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
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
            <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
              {item.priority}
            </Badge>
            <Badge className={`text-xs ${getCategoryColor(item.category)}`}>
              {item.category}
            </Badge>
          </div>
          
          {/* Risk and CVSS Information */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Badge className={`text-xs border ${getRiskColor(item.riskLevel)}`}>
                Risk: {item.riskLevel.toUpperCase()}
              </Badge>
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
                <Badge key={idx} variant="outline" className="text-xs">
                  {cveId}
                </Badge>
              ))}
              {item.affectedSystems && item.affectedSystems.map((system, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {system}
                </Badge>
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

  // Convex mutations and queries
  const generateTodoTasksAction = useAction(api.generateTodoTasks.generateTodoTasks);
  const updateTodoListMutation = useMutation(api.generateTodoTasks.updateTodoList);
  const getTodoListFromChatMutation = useMutation(api.generateTodoTasks.getTodoListFromChat);

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

  	const generateTodoList = async () => {
		console.log("🚨 [TodoListButton] GENERATE TODO LIST CALLED - This should appear when button is clicked!");
    console.log('[TodoListButton] generateTodoList called with:', {
      messageSender: message.sender,
      chatId,
      messageId: message.id || '',
      hasMessage: !!message.message,
    });
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

      // First, try to get existing TODO list from chat history
      console.log('[TodoListButton] Checking for existing TODO list...');
      const messageIdForLookup = message.humanInTheLoopId || message.id || '';
      console.log('[TodoListButton] Using messageId for lookup:', {
        messageId: messageIdForLookup,
        usingHumanInTheLoopId: !!message.humanInTheLoopId
      });
      
      const existingTodoList = await getTodoListFromChatMutation({
        chatId: chatId,
        messageId: messageIdForLookup
      });

      console.log('[TodoListButton] Existing TODO list check result:', {
        success: existingTodoList.success,
        hasTodoList: !!existingTodoList.todoList,
        todoListId: existingTodoList.todoList?.id,
        itemsCount: existingTodoList.todoList?.items?.length || 0,
      });

      if (existingTodoList.success && existingTodoList.todoList) {
        console.log('[TodoListButton] Found existing TODO list:', {
          todoListId: existingTodoList.todoList.id,
          title: existingTodoList.todoList.title,
          itemsCount: existingTodoList.todoList.items.length,
        });
        
        // Store the correct messageId separately (not in the todoList object)
        const correctMessageId = message.humanInTheLoopId || message.id || '';
        const existingTodoListWithIds = {
          ...existingTodoList.todoList,
          // Store messageId and chatId as separate properties for internal use
          _messageId: correctMessageId,
          _chatId: chatId
        };
        
        // Create a clean version without the extra fields for state
        const cleanExistingTodoList = {
          ...existingTodoList.todoList
        };
        
        console.log('[TodoListButton] Existing TODO list with IDs:', {
          todoListId: existingTodoListWithIds.id,
          messageId: existingTodoListWithIds._messageId,
          chatId: existingTodoListWithIds._chatId,
          hasMessageId: !!existingTodoListWithIds._messageId,
          hasChatId: !!existingTodoListWithIds._chatId
        });
        
        setTodoList(cleanExistingTodoList);
        setLastSavedOrder(cleanExistingTodoList.items.map((item: TodoItem) => item.id));
        setLastSavedCompletionStatus(cleanExistingTodoList.items.map((item: TodoItem) => ({ id: item.id, completed: item.completed })));
        setShowTodoList(true);
        setIsGenerating(false);
        return;
      }

      // Generate new TODO list using LLM with KG context and retry mechanism
      console.log('[TodoListButton] No existing TODO list found, generating new one...');
      
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
          
          result = await generateTodoTasksAction({
            chatId: chatId,
            messageId: messageIdToUse,
            aiResponse: message.message || '',
            kgContext: message.reasoningTrace ? JSON.stringify(message.reasoningTrace) : undefined,
            cveInfo: message.cveDescriptionsMap ? {
              cve_id: Object.keys(message.cveDescriptionsMap)[0],
              cve_desc: Object.values(message.cveDescriptionsMap)[0],
            } : undefined,
            reasoningTrace: message.reasoningTrace,
            sourceLinks: message.sourceLinks,
            jargons: message.jargons,
          });
          
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
    });

    if (todoList) {
      console.log('[TodoListButton] Toggling existing TODO list visibility');
      setShowTodoList(!showTodoList);
    } else {
      console.log('[TodoListButton] No existing TODO list, generating new one...');
      generateTodoList();
    }
  };

  const toggleTodoItem = (itemId: string) => {
    if (!todoList) return;
    
    setTodoList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
      };
    });
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Security': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Updates': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Configuration': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Monitoring': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'Testing': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800';
    }
  };

  const getCVSSColor = (score: number) => {
    if (score >= 9.0) return 'text-red-600 dark:text-red-400';
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
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          {todoList && (
            <>
              <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    <DialogTitle>{todoList.title}</DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
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
                      {isDownloading ? 'Generating...' : 'Download PDF'}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {todoList.description}
                </p>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] p-6">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={todoList.items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {todoList.items.map((item, index) => (
                        <SortableTodoItem
                          key={item.id}
                          item={item}
                          index={index}
                          onToggle={handleToggleItem}
                          getPriorityColor={getPriorityColor}
                          getCategoryColor={getCategoryColor}
                          getRiskColor={getRiskColor}
                          getCVSSColor={getCVSSColor}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {todoList.items.filter(item => item.completed).length} of {todoList.items.length} completed
                  </span>
                  <span>
                    Created {new Date(todoList.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodoListButton; 