import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

//components
import { ScrollArea } from "@components/ui/scroll-area";
import { Spinner } from "@components/loader/spinner";
import { Progress } from "@components/ui/progress";
import { HumanInTheLoopOptions } from "./human-in-the-loop-options";
import { HumanInTheLoopApproval } from "./human-in-the-loop-approval";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@components/ui/tooltip";

//apis
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { chatApis } from "../../api/chat";
import { chatWithJargon } from '../../api/chat';
import type { Id } from "../../convex/_generated/dataModel";

//store
import useStore from "../../store/store";
import useChatActionStore from "../../store/chatActions";

// svgs
import mira_logo from "../../assets/Mira_logo.png";

// types
import type { TriggerAgentData } from "../../types/agent";
import type { Folder, FolderItem, FolderType } from "../../types/reports";
import type {
	Message,
	ChatHistory,
	Info,
	RequestHumanInLoop,
} from "../../types/chats";

//constants
import { scanApis } from "../../api/scan";
import { ragApis } from "../../api/rag";
import useScanStore from "../../store/scanStore";
import MarkdownViewer from "../file/MarkdownViewer";
import {
	URL_PATTERN,
	STANDARDS,
	REPORTS,
	NEGATION_PATTERNS,
	CLARIFICATION_PATTERNS,
	SCANTYPES,
	CREATE_FOLDER_ACTION,
	GITHUB_URL_PATTERN,
	GITHUB_SCAN,
} from "./constants";
import { CreateFolderDialog } from "../folder/CreateFolderDialog";
import { HumanInTheLoopInput } from "./human-in-the-loop-input";
// import { getGreeting } from "./greetings";
import { showErrorToast, showInfoToast, showSuccessToast } from "../toaster";

import { agentApi } from "../../api/agent";
import RoleButtonGroup from "./chatComponents/RoleButton/RoleButtonGroup";
import { ReasoningTrace } from "./ReasoningTrace";
import { SourceLinks } from "./SourceLinks";

// Add helper for highlighting jargon terms
function highlightJargon(answer: string, jargons: { term: string; description: string }[] = [], cveDescriptionsMap: Record<string, string> = {}) {
	console.log('Highlighting jargons:', jargons); // Debug log
	
	const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
	const foundCVEs = (answer.match(cveRegex) || []).map(id => id.toUpperCase());
	
	// Build a map of all jargons (preserve original case for display, use lowercase for matching)
	const jargonMap = new Map<string, { originalTerm: string; description: string }>();
	
	// Add LLM-identified jargons
	jargons.forEach(j => {
		jargonMap.set(j.term.toLowerCase(), { originalTerm: j.term, description: j.description });
	});
	
	// Add CVE IDs with their specific descriptions from the backend
	foundCVEs.forEach(id => {
		const lowerCaseId = id.toLowerCase();
		if (!jargonMap.has(lowerCaseId)) {
			// Try to find the specific CVE description from the backend mapping
			const description = cveDescriptionsMap[id] || 
							   cveDescriptionsMap[lowerCaseId] || 
							   'A unique identifier for a publicly known cybersecurity vulnerability.';
			jargonMap.set(lowerCaseId, { originalTerm: id, description });
		}
	});
	
	const allJargons = Array.from(jargonMap, ([, { originalTerm, description }]) => ({ term: originalTerm, description }));
	if (!allJargons || allJargons.length === 0) {
		console.log('No jargons to highlight');
		return answer;
	}
	
	console.log('Will highlight these jargons:', allJargons.map(j => j.term));
	
	// Sort by term length descending to avoid partial matches (longer terms first)
	const sortedJargons = [...allJargons].sort((a, b) => b.term.length - a.term.length);
	let parts: (string | JSX.Element)[] = [answer];
	
	sortedJargons.forEach(({ term, description }) => {
		console.log(`Highlighting term: "${term}"`);
		
		// Improved regex with word boundary consideration for multi-word terms
		const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// Use word boundaries for single words, but allow partial matches for multi-word terms and technical terms
		const isMultiWord = term.includes(' ') || term.includes('-') || /^[A-Z]{2,}/.test(term);
		const regex = isMultiWord 
			? new RegExp(`(${escapedTerm})`, 'gi')
			: new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
		
		console.log(`Creating regex for "${term}": ${regex.toString()}, isMultiWord: ${isMultiWord}`);
		
		parts = parts.flatMap(part => {
			if (typeof part !== 'string') return [part];
			
			const splitParts = part.split(regex);
			return splitParts.map((p, i) => {
				const isMatch = splitParts.length > 1 && i % 2 === 1 && p.toLowerCase() === term.toLowerCase();
				if (isMatch) {
					// Use a stateful tooltip for accessibility
					return (
						<Tooltip key={`${term}-${i}-${Math.random()}`}>
							<TooltipTrigger asChild>
								<span
									className="jargon-highlight inline-block focus-within:z-50 cursor-pointer bg-yellow-100 border-b-2 border-dotted border-yellow-400 rounded px-1"
									tabIndex={0}
									style={{ background: 'rgba(255, 230, 150, 0.7)' }}
								>
									{p}
								</span>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs whitespace-pre-line break-words box-border">
								{description}
							</TooltipContent>
						</Tooltip>
					);
				}
				return p;
			});
		});
	});
	
	console.log('Highlighting complete, returning parts:', parts.length);
	return parts;
}

function getRelatedQuestions(userQuestion: string, aiAnswer: string, kgContext: string, chatHistory: Message[]) {
	const context = (userQuestion + ' ' + aiAnswer + ' ' + (kgContext || '')).toLowerCase();
	const previousQuestions = new Set(
		(chatHistory || [])
			.filter((msg) => msg.sender === 'user' || msg.isRelatedQuestion)
			.map((msg) => (msg.message || '').toLowerCase())
	);
	let candidates = [];
	if (context.includes('wordpress')) {
		candidates = [
			'How do I secure my WordPress site?',
			'What are the most common WordPress vulnerabilities?',
			'Are there plugins to improve WordPress security?'
		];
	} else if (context.includes('sql injection')) {
		candidates = [
			'What are the risks of SQL injection?',
			'How can I prevent SQL injection?',
			'What tools detect SQL injection vulnerabilities?'
		];
	} else if (context.includes('xss') || context.includes('cross-site scripting')) {
		candidates = [
			'What is cross-site scripting (XSS)?',
			'How do I protect my app from XSS?',
			'What are common XSS attack vectors?'
		];
	} else if (context.includes('csrf')) {
		candidates = [
			'What is CSRF?',
			'How can I prevent CSRF attacks?',
			'What are signs of CSRF vulnerabilities?'
		];
	} else if (context.includes('authentication')) {
		candidates = [
			'What are best practices for authentication?',
			'How do I implement secure authentication?',
			'What are common authentication flaws?'
		];
	} else if (context.includes('authorization')) {
		candidates = [
			'What is the difference between authentication and authorization?',
			'How do I enforce proper authorization?',
			'What are common authorization issues?'
		];
	} else {
		candidates = [
			'What are common risks?',
			'How can I prevent this?',
			'Can you give an example?'
		];
	}
	const unique = candidates.filter(q => !previousQuestions.has(q.toLowerCase()));
	return unique.slice(0, 3);
}

// Agent Personality System Prompts
const generateAgentPersonalityPrompt = (mode: 'tutor' | 'investigator' | 'analyst', userQuestion: string): string => {
	const personalityPrompts = {
		tutor: `You are MIRA, a cybersecurity tutor. Your role is to be a step-by-step educator that explains every concept and command to help users learn cybersecurity.

PERSONALITY TRAITS:
- Patient and encouraging educator
- Breaks down complex concepts into simple steps  
- Provides definitions, context, and examples
- Uses phrases like "Let's break it down...", "Here's what this means...", "To understand this better..."
- Always explains WHY something is important, not just WHAT it is
- Encourages questions and learning

RESPONSE STRUCTURE:
1. Start with "Let's break it down..." or similar educational phrase
2. Define key terms and concepts clearly
3. Explain step-by-step how things work
4. Provide real-world examples
5. Explain the practical implications
6. End with encouragement to ask follow-up questions

TONE: Friendly, patient, educational, encouraging

User Question: ${userQuestion}

Respond as MIRA the cybersecurity tutor, focusing on teaching and explaining concepts clearly.`,

		investigator: `You are MIRA, a cybersecurity investigator. Your role is to dig deep into CVEs, threat analysis, and exploits with forensic precision.

PERSONALITY TRAITS:
- Analytical and detail-oriented detective
- Investigates root causes and attack vectors
- Traces vulnerabilities to their origins
- Uses phrases like "CVE-2024-XYZ targets...", "The attack vector involves...", "Investigation reveals..."
- Focuses on technical evidence and proof
- Correlates threats across different sources

RESPONSE STRUCTURE:
1. Lead with investigation findings (e.g., "CVE-2024-XYZ targets...")
2. Analyze the vulnerability's origin and affected versions
3. Detail the attack vectors and exploitation methods
4. Assess risk severity with evidence
5. Trace the timeline of discovery and patches
6. Connect to related threats or attack patterns

TONE: Professional, analytical, evidence-based, thorough

User Question: ${userQuestion}

Respond as MIRA the cybersecurity investigator, focusing on deep technical analysis and threat investigation.`,

		analyst: `You are MIRA, a cybersecurity analyst in power mode. Your role is to provide advanced, multi-step, detailed analysis using multiple reasoning agents for expert users.

PERSONALITY TRAITS:
- Advanced analytical powerhouse
- Uses multi-agent reasoning approach
- Provides comprehensive workflows and correlations
- Uses phrases like "Step 1 correlates X...", "Multi-layer analysis reveals...", "Cross-referencing threat intel..."
- Delivers enterprise-grade intelligence
- References multiple data sources and frameworks

RESPONSE STRUCTURE:
1. Executive Summary of findings
2. Multi-step analytical workflow:
   - Step 1: Initial correlation analysis
   - Step 2: Threat intelligence cross-referencing  
   - Step 3: Risk assessment and scoring
   - Step 4: Impact analysis and business implications
3. Advanced technical details with frameworks (MITRE ATT&CK, OWASP, etc.)
4. Threat landscape positioning
5. Strategic recommendations with references
6. Future monitoring and detection strategies

TONE: Expert-level, comprehensive, strategic, authoritative

User Question: ${userQuestion}

Respond as MIRA the cybersecurity analyst in power mode, providing advanced multi-layered analysis with detailed workflows and correlations.`
	};

	return personalityPrompts[mode];
};

const MiraChatBot: React.FC = () => {
	const navigate = useNavigate();
	const [scanType, setScanType] = useState<string | null>(null);
	const [confirmType, setConfirmType] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [, setStreaming] = useState(false);
	const [chatsLoader, setChatsLoader] = useState(false);
	const [info, setInfo] = useState<Info[]>([]);
	const [isScanLoading, setIsScanLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [input, setInput] = useState("");
	const [progressLoaderMessage, setProgressLoaderMessage] = useState("");
	const [folderId, setFolderId] = useState("");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [foldersList, setFoldersList] = useState(CREATE_FOLDER_ACTION);
	const [requestHumanInLoop, setRequestHumanInLoop] =
		useState<RequestHumanInLoop | null>();

	// Agent Personality State
	const [selectedAgentMode, setSelectedAgentMode] = useState<'tutor' | 'investigator' | 'analyst' | undefined>('tutor');
	const [agentButtonsDisabled, setAgentButtonsDisabled] = useState(false);

	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const { chatId: chatIdParam } = useParams<{ chatId: string }>();
	const chatId = chatIdParam;

	// const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	//store actions

	const { user } = useStore();
	const {
		scanResponse,
		setScanResponse,
		scanSastResponse,
		setScanSastResponse,
	} = useScanStore();
	const {
		targetUrl,
		fetchChatsRegurlarly,
		messages,
		createdChatId,
		pendingAction,
		actionPrompts,
		actionType,
		humanInTheLoopMessage,
		setTargetUrl,
		setFetchChatsRegurlarly,
		setMessages,
		setCreatedChatId,
		setPendingAction,
		setActionPrompts,
		setActionType,
		setHumanInTheLoopMessage,
		chatSummaryContent,
		setChatSummaryContent,
	} = useChatActionStore();

	// Add state to track shown related questions
	const [shownRelatedQuestions, setShownRelatedQuestions] = useState<string[]>([]);
	// Collector for all related questions shown in this render
	let allRelatedQuestionsThisRender: string[] = [];

	// Track shown related questions per context
	const [contextToShownQuestions, setContextToShownQuestions] = useState<{ [context: string]: string[] }>({});

	// Track when the AI starts thinking (spinner shown)
	const thinkingStartRef = useRef<number | null>(null);

	// Get greeting based on the detected time zone
	// const greeting = getGreeting(timeZone);
	const saveChatMessage = useMutation(api.chats.saveChatMessage);
	const saveEnhancedChatMessage = useMutation(api.chats.saveEnhancedChatMessage);
	const saveChat = useMutation(api.chats.saveChat);
	const saveFile = useMutation(api.reports.addReport);
	const saveSummary = useMutation(api.summaries.saveSummary);
	const isValidChatId = useQuery(api.chats.validateChatId, {
		chatId: chatIdParam ? chatIdParam : "",
		userId: String(user?.id),
	});
	const folderData = useQuery(
		api.reports.getReportFoldersByUser,
		user?.id && {
			userId: String(user?.id),
		},
	);
	const chatData = useQuery(
		api.chats.getChatHistory,
		fetchChatsRegurlarly && isValidChatId ? { chatId: chatId } : "skip",
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: all dependencies not needed
	useEffect(() => {
		setChatsLoader(true);
		if (chatIdParam) {
			setFetchChatsRegurlarly(true);
			setCreatedChatId(chatIdParam);
			if (isValidChatId !== undefined) {
				setFetchChatsRegurlarly(false);
				if (isValidChatId) {
					setFetchChatsRegurlarly(true);
				} else {
					setMessages([]);
					setFetchChatsRegurlarly(false);
					navigate("/chatbot");
					setChatsLoader(false);
				}
			}
		} else {
			setChatsLoader(false);
			setMessages([]);
		}
	}, [chatIdParam, isValidChatId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: all dependencies not needed
	useEffect(() => {
		handleScrollToBottom();
	}, [messages]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: all dependencies not needed
	useEffect(() => {
		if (chatData) {
			console.log('Loading chat history from database:', chatData);
			const chatHistory: Message[] = chatData.map(
				(chat: ChatHistory): Message => {
					// Debug: Check if enhanced data exists
					if (chat.sender === "ai") {
						console.log('AI message enhanced data:', {
							hasJargons: !!chat.Jargons,
							jargonsKeys: chat.Jargons ? Object.keys(chat.Jargons) : [],
							hasReasoning: !!chat.Reasoning,
							hasInfo: !!chat.Info
						});
					}
					
					// Convert Jargons object back to array format for frontend
					const jargons = chat.Jargons 
						? Object.entries(chat.Jargons).map(([term, description]) => ({ term, description }))
						: undefined;
					
					// Convert reasoning trace if available
					const reasoningTrace = chat.Reasoning?.trace || undefined;
					
					// Create CVE descriptions map from Info if available
					const cveDescriptionsMap = chat.Info?.cve_id 
						? { [chat.Info.cve_id]: chat.Info.cve_desc || 'CVE description not available' }
						: undefined;
					
					// Map SourceLinks from database format with type casting
					const sourceLinks = chat.SourceLinks?.map(source => ({
						...source,
						type: source.type as 'official' | 'reference' | 'framework'
					})) || undefined;
					
					return {
						id: chat._id,
						humanInTheLoopId: chat.humanInTheLoopId,
						chatId: chat.chatId,
						message: chat.message,
						sender: chat.sender as "user" | "ai",
						// Include enhanced fields for AI messages
						...(chat.sender === "ai" && {
							jargons,
							reasoningTrace,
							cveDescriptionsMap,
							sourceLinks,
						}),
					};
				},
			);

			setMessages(chatHistory);

			setChatsLoader(false);
		}
		if (folderData) {
			const newFolders: FolderItem[] = folderData.map(
				(item: FolderType): FolderItem => ({
					id: item._id,
					name: item.folderName,
					type: "folder",
				}),
			);

			const updatedFoldersList: FolderItem[] = [
				...foldersList,
				...newFolders.filter(
					(newFolder: FolderItem) =>
						!foldersList.some(
							(folder: FolderItem) => folder.id === newFolder.id,
						),
				),
			];

			setFoldersList(updatedFoldersList);
		}
	}, [chatData, folderData]);

	const handleTitleGeneration = async (messages: string) => {
		try {
			const response = await generateTitle(messages);

			return response;
		} catch (error) {
			return error;
		}
	};

	const handleScrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			if (scrollAreaRef.current) {
				const scrollContainer = scrollAreaRef.current.querySelector(
					"[data-radix-scroll-area-viewport]",
				);
				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			}
		});
	}, []);
	const saveReport = useMutation(api.reports.createReportFolder);

	const handleCreateFolder = async (
		name: string,
		action: RequestHumanInLoop | null | undefined,
	) => {
		if (
			foldersList.some(
				(folder) => folder.name.toLowerCase() === name.toLowerCase(),
			)
		) {
			showErrorToast("A folder with this name already exists.");
			return;
		}

		const newFolder: Folder = {
			id: uuidv4(),
			name,
			files: [],
			createdAt: new Date(),
		};

		const response = await saveReport({
			folderName: newFolder.name,
			userId: String(user?.id),
		});
		if (response && action) {
			setPendingAction(null);
			addBotMessage(`Created folder ${newFolder.name} `);
			const manualMessage = "Thank you for providing the file name";
			const botMessage: Message = {
				id: uuidv4(),
				message: manualMessage,
				sender: "ai",
			};
			setFolderId(response);
			await saveChatMessage({
				chatId: createdChatId
					? (createdChatId as Id<"chats">)
					: (chatId as Id<"chats">),
				humanInTheLoopId: botMessage.id,
				sender: botMessage.sender,
				message: botMessage.message,
			});
			setPendingAction(botMessage.id as string);
			setRequestHumanInLoop({
				action: action.action,
				prompt: manualMessage,
				type: action.type,
				id: botMessage.id,
			});
			requestHumanApproval(
				action.action,
				manualMessage,
				action.type,
				botMessage.id,
			);
		}
	};

	const processPrompt = async (userMessage: Message, useRAG?: boolean) => {
		setIsLoading(true);
		setAgentButtonsDisabled(true); // Disable agent buttons during processing
		const lowerPrompt = userMessage.message.toLowerCase().trim();
		const extractURLs = (text: string): string[] => {
			return text.match(URL_PATTERN) || [];
		};
		const urls = extractURLs(userMessage.message);
		setTargetUrl(urls[0]);
		const isGitHubURL = GITHUB_URL_PATTERN.test(lowerPrompt);
		const hasNegation = NEGATION_PATTERNS.some((pattern) =>
			pattern.test(lowerPrompt),
		);
		const isClarification = CLARIFICATION_PATTERNS.test(lowerPrompt);
		// const reportRequest = isReportRequest(lowerPrompt);

		console.log('🔍 FLOW DEBUG:', {
			lowerPrompt,
			hasNegation,
			isClarification,
			isGitHubURL,
			willTakeMainFlow: !hasNegation && !isClarification && !isGitHubURL
		});

		if (hasNegation) {
			// Use chatWithJargon for all questions, including negations
			const graphRAGResponse = await chatWithJargon({
				message: userMessage.message,
				agentPersonality: selectedAgentMode
			});

			const botMessage: Message = {
				id: uuidv4(),
				message: graphRAGResponse.answer,
				sender: "ai",
				reasoningTrace: graphRAGResponse.reasoningTrace,
				durationSec: thinkingStartRef.current ? (Date.now() - thinkingStartRef.current) / 1000 : undefined,
			};
			// Reset start ref after computing
			thinkingStartRef.current = null;

			// Add messages to UI
			setMessages((prev) => [...prev, botMessage]);

			// Save messages to database
			if (!chatId && !createdChatId) {
				await processManualMessages(userMessage, botMessage);
			} else {
				await saveChatMessage({
					chatId: chatId
						? (chatId as Id<"chats">)
						: (createdChatId as Id<"chats">),
					humanInTheLoopId: userMessage.id,
					sender: userMessage.sender,
					message: userMessage.message,
				});

				await saveChatMessage({
					chatId: chatId
						? (chatId as Id<"chats">)
						: (createdChatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});
			}

			setIsLoading(false);
		} else if (isClarification) {
			// Route clarification to main flow for enhanced processing
			console.log('🔄 CLARIFICATION ROUTED TO MAIN FLOW');
			// Use the same logic as main flow
			try {
				console.log('🚀 ENTERING CLARIFICATION WITH ENHANCED FLOW');
				console.log('UserMessage:', userMessage);
				setIsLoading(true);
				
				// User message is already added earlier, no need to add again
				
				// Use chatWithJargon for clarifications with agent personality
				console.log('Sending clarification request with agent personality:', selectedAgentMode);
				const response = await chatWithJargon({ 
					message: userMessage.message,
					agentPersonality: selectedAgentMode 
				});
				console.log('Backend response:', {
					jargons: response.jargons,
					cveDescriptionsMap: response.cveDescriptionsMap,
					answerLength: response.answer?.length,
					dynamicTag: response.dynamicTag,
					sourceLinks: response.sourceLinks,
					contextData: response.contextData
				});
				console.log('Full backend response:', response);
				
				// Validate response structure
				if (!response.answer) {
					console.error('ERROR: No answer in response!');
					throw new Error('Backend response missing answer field');
				}
				console.log('Dynamic tag validation:', {
					exists: !!response.dynamicTag,
					value: response.dynamicTag,
					type: typeof response.dynamicTag,
					fallback: response.dynamicTag || "cybersecurity_general"
				});
				console.log('Context data from backend:', response.contextData);
				
				// Test if saveEnhancedChatMessage function exists
				console.log('saveEnhancedChatMessage function:', typeof saveEnhancedChatMessage);
				
				console.log('Creating botMessage with response data:', {
					hasJargons: !!(response.jargons && response.jargons.length > 0),
					jargonsCount: response.jargons?.length || 0,
					hasSourceLinks: !!(response.sourceLinks && response.sourceLinks.length > 0),
					sourceLinksCount: response.sourceLinks?.length || 0,
					jargons: response.jargons
				});
				
				const botMessage: Message = {
					id: uuidv4(),
					message: response.answer,
					sender: 'ai',
					reasoningTrace: response.reasoningTrace,
					jargons: response.jargons,
					cveDescriptionsMap: response.cveDescriptionsMap,
					sourceLinks: response.sourceLinks || [],
					durationSec: thinkingStartRef.current ? (Date.now() - thinkingStartRef.current) / 1000 : undefined,
				};
				thinkingStartRef.current = null;
				
				console.log('Created botMessage:', {
					hasJargons: !!(botMessage.jargons && botMessage.jargons.length > 0),
					jargonsCount: botMessage.jargons?.length || 0,
					jargons: botMessage.jargons
				});
				
				// Save AI response to database (same logic as main flow)
				const currentChatId = createdChatId || chatId;
				console.log('Debug - Chat IDs:', { createdChatId, chatId, currentChatId });
				console.log('Will save to database:', !!currentChatId, 'or create new chat:', !currentChatId);
				
				if (currentChatId) {
					try {
						console.log('Saving AI response to database with chatId:', currentChatId);
						
						// Prepare enhanced data for AI response
						const jargonsObject = response.jargons ? 
							response.jargons.reduce((acc: Record<string, string>, jargon: { term: string; description: string }) => {
								acc[jargon.term] = jargon.description;
								return acc;
							}, {}) : {};
						
						const reasoningObject = response.reasoningTrace ? 
							{ trace: response.reasoningTrace } : {};
						
						// Enhanced Info field population with context data
						const cveIds = Object.keys(response.cveDescriptionsMap || {});
						const contextCveIds = response.contextData?.cveIds || [];
						const allCveIds = [...cveIds, ...contextCveIds.filter((id: string) => !cveIds.includes(id))];
						
						const mainCveId = allCveIds.length > 0 ? allCveIds[0] : undefined;
						const mainCveDesc = mainCveId ? (
							response.cveDescriptionsMap?.[mainCveId] || 
							response.contextData?.cveDescriptions?.[0] ||
							"CVE description not available"
						) : undefined;
						
						// Get mitigation from context data
						const mitigation = response.contextData?.mitigations?.[0] || "Apply security patches and follow vendor recommendations";
						
						const sources = response.reasoningTrace?.map((step: { step: string; message: string }) => step.step).filter(Boolean) || [];
						
						console.log('Prepared enhanced data:', {
							jargonsObject,
							reasoningObject,
							sourceLinks: response.sourceLinks,
							cveInfo: mainCveId ? { cve_id: mainCveId, cve_desc: mainCveDesc, mitigation } : response.contextData ? {
								concept: response.contextData.concept,
								risk_level: response.contextData.riskLevels?.[0],
								mitigation: mitigation
							} : undefined,
							contextData: response.contextData,
							sources,
							jargonsCount: Object.keys(jargonsObject).length
						});
						
						// Use enhanced save for AI response with all the extra fields
						const enhancedData = {
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: currentChatId as Id<"chats">,
							sender: botMessage.sender,
							message: botMessage.message,
							Answer: response.answer,
							Reasoning: reasoningObject,
							Sources: sources,
							SourceLinks: response.sourceLinks || [],
							Jargons: jargonsObject,
							Info: mainCveId ? {
								cve_id: mainCveId,
								cve_desc: mainCveDesc,
								mitigation: mitigation
							} : (response.contextData && (response.contextData.concept || response.contextData.riskLevels?.[0])) ? {
								cve_id: response.contextData.concept || "General Security Topic",
								cve_desc: `Risk Level: ${response.contextData.riskLevels?.[0] || "Unknown"}. Topic: ${response.contextData.concept || "Security analysis"}`,
								mitigation: mitigation
							} : undefined,
							Severity: "Medium",
							tags: [response.dynamicTag || "cybersecurity_general"]
						};
						
						console.log('About to save with data:', enhancedData);
						console.log('Tag being saved to database:', enhancedData.tags);
						
						await saveEnhancedChatMessage(enhancedData);
						console.log('AI response saved successfully with enhanced data');
					} catch (saveError) {
						console.error('Failed to save AI response with enhanced data:', saveError);
						console.error('Save error details:', saveError);
						console.error('Enhanced data that failed to save:', {
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: currentChatId,
							sender: botMessage.sender,
							message: botMessage.message,
							Answer: response.answer,
							hasSourceLinks: !!(response.sourceLinks && response.sourceLinks.length > 0),
							hasJargons: !!(response.jargons && response.jargons.length > 0),
							hasDynamicTag: !!response.dynamicTag,
							hasContextData: !!response.contextData
						});
						
						// Fallback: try saving with basic saveChatMessage
						try {
							console.log('Attempting fallback save with basic saveChatMessage...');
							await saveChatMessage({
								humanInTheLoopId: botMessage.id || uuidv4(),
								chatId: currentChatId as Id<"chats">,
								sender: botMessage.sender,
								message: botMessage.message,
							});
							console.log('Fallback save successful');
						} catch (fallbackError) {
							console.error('Fallback save also failed:', fallbackError);
						}
					}
				} else {
					console.log('No chatId available, creating new chat first...');
					console.log('User ID for new chat:', user?.id);
					
					// Try to create a new chat if none exists
					try {
						console.log('Creating new chat with default title...');
						const titleResponse = await generateTitle(userMessage.message || response.answer);
						const chatTitle = (titleResponse as { title: string })?.title || "Chat";
						const newChatResult = await saveChat({
							userId: String(user?.id || "anonymous"),
							title: chatTitle,
						});
						setCreatedChatId(newChatResult);
						console.log('New chat created with ID:', newChatResult);
						
						// Now save the user message (if not already saved)
						await saveChatMessage({
							humanInTheLoopId: userMessage.id || uuidv4(),
							chatId: newChatResult as Id<"chats">,
							sender: userMessage.sender,
							message: userMessage.message,
						});
						console.log('User message saved to new chat');
						
						// Save the AI response with enhanced data
						const jargonsObject = response.jargons ? 
							response.jargons.reduce((acc: Record<string, string>, jargon: { term: string; description: string }) => {
								acc[jargon.term] = jargon.description;
								return acc;
							}, {}) : {};
						
						const reasoningObject = response.reasoningTrace ? 
							{ trace: response.reasoningTrace } : {};
						
						// Enhanced Info field population with context data (for new chat)
						const cveIds = Object.keys(response.cveDescriptionsMap || {});
						const contextCveIds = response.contextData?.cveIds || [];
						const allCveIds = [...cveIds, ...contextCveIds.filter((id: string) => !cveIds.includes(id))];
						
						const mainCveId = allCveIds.length > 0 ? allCveIds[0] : undefined;
						const mainCveDesc = mainCveId ? (
							response.cveDescriptionsMap?.[mainCveId] || 
							response.contextData?.cveDescriptions?.[0] ||
							"CVE description not available"
						) : undefined;
						
						// Get mitigation from context data
						const mitigation = response.contextData?.mitigations?.[0] || "Apply security patches and follow vendor recommendations";
						
						const sources = response.reasoningTrace?.map((step: { step: string; message: string }) => step.step).filter(Boolean) || [];
						
						await saveEnhancedChatMessage({
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: newChatResult as Id<"chats">,
							sender: botMessage.sender,
							message: botMessage.message,
							Answer: response.answer,
							Reasoning: reasoningObject,
							Sources: sources,
							SourceLinks: response.sourceLinks || [],
							Jargons: jargonsObject,
							Info: mainCveId ? {
								cve_id: mainCveId,
								cve_desc: mainCveDesc,
								mitigation: mitigation
							} : (response.contextData && (response.contextData.concept || response.contextData.riskLevels?.[0])) ? {
								cve_id: response.contextData.concept || "General Security Topic",
								cve_desc: `Risk Level: ${response.contextData.riskLevels?.[0] || "Unknown"}. Topic: ${response.contextData.concept || "Security analysis"}`,
								mitigation: mitigation
							} : undefined,
							Severity: "Medium",
							tags: [response.dynamicTag || "cybersecurity_general"]
						});
						console.log('AI response saved to new chat with enhanced data');
						
						// Update URL
						window.history.pushState(
							{ path: `/chatbot/${newChatResult}` },
							"",
							`/chatbot/${newChatResult}`,
						);
					} catch (chatCreateError) {
						console.error('Failed to create new chat:', chatCreateError);
					}
				}
				
				console.log('Adding botMessage to UI with jargons:', {
					hasJargons: !!botMessage.jargons,
					jargonsCount: botMessage.jargons?.length || 0,
					jargons: botMessage.jargons,
					hasSourceLinks: !!botMessage.sourceLinks,
					sourceLinksCount: botMessage.sourceLinks?.length || 0
				});
				setMessages((prev) => [...prev, botMessage]);
				setIsLoading(false);
				setAgentButtonsDisabled(false); // Re-enable agent buttons
			} catch (error) {
				setIsLoading(false);
				setAgentButtonsDisabled(false); // Re-enable agent buttons on error
				showErrorToast('Failed to get answer.');
			}
		} else if (isGitHubURL) {
			setIsLoading(false);
			const urls = extractURLs(userMessage.message);
			setTargetUrl(urls[0]);
			const manualMessage =
				"Thank you for providing the URL. Please select type of repository.";
			const botMessage: Message = {
				id: uuidv4(),
				message: manualMessage,
				sender: "ai",
			};

			if (!chatId && !createdChatId) {
				processManualMessages(userMessage, botMessage);
			} else {
				await saveChatMessage({
					chatId: chatId
						? (chatId as Id<"chats">)
						: (createdChatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});
			}
			setPendingAction(botMessage.id as string);
			setRequestHumanInLoop({
				action: "github-scan",
				prompt: manualMessage,
				type: "none",
				id: botMessage.id,
			});
			requestHumanApproval("github-scan", manualMessage, "none", botMessage.id);
		} else {
			try {
				console.log('🚀 ENTERING MAIN CHAT FLOW');
				console.log('UserMessage:', userMessage);
				setIsLoading(true);
				
				// Add user message to UI first
				setMessages((prev) => [...prev, userMessage]);
				
				// Use chatWithJargon for the main chat flow with agent personality
				console.log('Sending request with agent personality:', selectedAgentMode);
				const response = await chatWithJargon({ 
					message: userMessage.message,
					agentPersonality: selectedAgentMode 
				});
				console.log('Backend response:', {
					jargons: response.jargons,
					cveDescriptionsMap: response.cveDescriptionsMap,
					answerLength: response.answer?.length,
					dynamicTag: response.dynamicTag,
					sourceLinks: response.sourceLinks,
					contextData: response.contextData
				});
				console.log('Full backend response:', response);
				
				// Validate response structure
				if (!response.answer) {
					console.error('ERROR: No answer in response!');
					throw new Error('Backend response missing answer field');
				}
				console.log('Dynamic tag validation:', {
					exists: !!response.dynamicTag,
					value: response.dynamicTag,
					type: typeof response.dynamicTag,
					fallback: response.dynamicTag || "cybersecurity_general"
				});
				console.log('Context data from backend:', response.contextData);
				
				// Test if saveEnhancedChatMessage function exists
				console.log('saveEnhancedChatMessage function:', typeof saveEnhancedChatMessage);
				
				console.log('Creating botMessage with response data:', {
					hasJargons: !!(response.jargons && response.jargons.length > 0),
					jargonsCount: response.jargons?.length || 0,
					hasSourceLinks: !!(response.sourceLinks && response.sourceLinks.length > 0),
					sourceLinksCount: response.sourceLinks?.length || 0,
					jargons: response.jargons
				});
				
				const botMessage: Message = {
					id: uuidv4(),
					message: response.answer,
					sender: 'ai',
					reasoningTrace: response.reasoningTrace,
					jargons: response.jargons,
					cveDescriptionsMap: response.cveDescriptionsMap,
					sourceLinks: response.sourceLinks || [],
					durationSec: thinkingStartRef.current ? (Date.now() - thinkingStartRef.current) / 1000 : undefined,
				};
				thinkingStartRef.current = null;
				
				console.log('Created botMessage:', {
					hasJargons: !!(botMessage.jargons && botMessage.jargons.length > 0),
					jargonsCount: botMessage.jargons?.length || 0,
					jargons: botMessage.jargons
				});
				
				// Save AI response to database
				const currentChatId = createdChatId || chatId;
				console.log('Debug - Chat IDs:', { createdChatId, chatId, currentChatId });
				console.log('Will save to database:', !!currentChatId, 'or create new chat:', !currentChatId);
				
				if (currentChatId) {
					try {
						console.log('Saving AI response to database with chatId:', currentChatId);
						
						// Prepare enhanced data for AI response
						const jargonsObject = response.jargons ? 
							response.jargons.reduce((acc: Record<string, string>, jargon: { term: string; description: string }) => {
								acc[jargon.term] = jargon.description;
								return acc;
							}, {}) : {};
						
						const reasoningObject = response.reasoningTrace ? 
							{ trace: response.reasoningTrace } : {};
						
						// Enhanced Info field population with context data
						const cveIds = Object.keys(response.cveDescriptionsMap || {});
						const contextCveIds = response.contextData?.cveIds || [];
						const allCveIds = [...cveIds, ...contextCveIds.filter((id: string) => !cveIds.includes(id))];
						
						const mainCveId = allCveIds.length > 0 ? allCveIds[0] : undefined;
						const mainCveDesc = mainCveId ? (
							response.cveDescriptionsMap?.[mainCveId] || 
							response.contextData?.cveDescriptions?.[0] ||
							"CVE description not available"
						) : undefined;
						
						// Get mitigation from context data
						const mitigation = response.contextData?.mitigations?.[0] || "Apply security patches and follow vendor recommendations";
						
						const sources = response.reasoningTrace?.map((step: { step: string; message: string }) => step.step).filter(Boolean) || [];
						
						console.log('Prepared enhanced data:', {
							jargonsObject,
							reasoningObject,
							sourceLinks: response.sourceLinks,
							cveInfo: mainCveId ? { cve_id: mainCveId, cve_desc: mainCveDesc, mitigation } : response.contextData ? {
								concept: response.contextData.concept,
								risk_level: response.contextData.riskLevels?.[0],
								mitigation: mitigation
							} : undefined,
							contextData: response.contextData,
							sources,
							jargonsCount: Object.keys(jargonsObject).length
						});
						
						// Use enhanced save for AI response with all the extra fields
						const enhancedData = {
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: currentChatId as Id<"chats">,
							sender: botMessage.sender,
							message: botMessage.message,
							Answer: response.answer,
							Reasoning: reasoningObject,
							Sources: sources,
							SourceLinks: response.sourceLinks || [],
							Jargons: jargonsObject,
							Info: mainCveId ? {
								cve_id: mainCveId,
								cve_desc: mainCveDesc,
								mitigation: mitigation
							} : (response.contextData && (response.contextData.concept || response.contextData.riskLevels?.[0])) ? {
								cve_id: response.contextData.concept || "General Security Topic",
								cve_desc: `Risk Level: ${response.contextData.riskLevels?.[0] || "Unknown"}. Topic: ${response.contextData.concept || "Security analysis"}`,
								mitigation: mitigation
							} : undefined,
							Severity: "Medium",
							tags: [response.dynamicTag || "cybersecurity_general"]
						};
						
						console.log('About to save with data:', enhancedData);
						console.log('Tag being saved to database:', enhancedData.tags);
						
						await saveEnhancedChatMessage(enhancedData);
						console.log('AI response saved successfully with enhanced data');
									} catch (saveError) {
					console.error('Failed to save AI response with enhanced data:', saveError);
					console.error('Save error details:', saveError);
					console.error('Enhanced data that failed to save:', {
						humanInTheLoopId: botMessage.id || uuidv4(),
						chatId: currentChatId,
						sender: botMessage.sender,
						message: botMessage.message,
						Answer: response.answer,
						hasSourceLinks: !!(response.sourceLinks && response.sourceLinks.length > 0),
						hasJargons: !!(response.jargons && response.jargons.length > 0),
						hasDynamicTag: !!response.dynamicTag,
						hasContextData: !!response.contextData
					});
					
					// Fallback: try saving with basic saveChatMessage
					try {
						console.log('Attempting fallback save with basic saveChatMessage...');
						await saveChatMessage({
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: currentChatId as Id<"chats">,
							sender: botMessage.sender,
							message: botMessage.message,
						});
						console.log('Fallback save successful');
					} catch (fallbackError) {
						console.error('Fallback save also failed:', fallbackError);
					}
				}
				} else {
					console.log('No chatId available, creating new chat first...');
					console.log('User ID for new chat:', user?.id);
					
					// Try to create a new chat if none exists
					try {
						console.log('Creating new chat with default title...');
						const titleResponse2 = await generateTitle(userMessage.message || response.answer);
						const chatTitle2 = (titleResponse2 as { title: string })?.title || "Chat";
						const newChatResult2 = await saveChat({
							userId: String(user?.id || "anonymous"),
							title: chatTitle2,
						});
						setCreatedChatId(newChatResult2);
						console.log('New chat created with ID:', newChatResult2);
						
						// Now save the user message (if not already saved)
						await saveChatMessage({
							humanInTheLoopId: userMessage.id || uuidv4(),
							chatId: newChatResult2 as Id<"chats">,
							sender: userMessage.sender,
							message: userMessage.message,
						});
						console.log('User message saved to new chat');
						
						// Save the AI response with enhanced data
						const jargonsObject = response.jargons ? 
							response.jargons.reduce((acc: Record<string, string>, jargon: { term: string; description: string }) => {
								acc[jargon.term] = jargon.description;
								return acc;
							}, {}) : {};
						
						const reasoningObject = response.reasoningTrace ? 
							{ trace: response.reasoningTrace } : {};
						
						// Enhanced Info field population with context data (for new chat)
						const cveIds = Object.keys(response.cveDescriptionsMap || {});
						const contextCveIds = response.contextData?.cveIds || [];
						const allCveIds = [...cveIds, ...contextCveIds.filter((id: string) => !cveIds.includes(id))];
						
						const mainCveId = allCveIds.length > 0 ? allCveIds[0] : undefined;
						const mainCveDesc = mainCveId ? (
							response.cveDescriptionsMap?.[mainCveId] || 
							response.contextData?.cveDescriptions?.[0] ||
							"CVE description not available"
						) : undefined;
						
						// Get mitigation from context data
						const mitigation = response.contextData?.mitigations?.[0] || "Apply security patches and follow vendor recommendations";
						
						const sources = response.reasoningTrace?.map((step: { step: string; message: string }) => step.step).filter(Boolean) || [];
						
						await saveEnhancedChatMessage({
							humanInTheLoopId: botMessage.id || uuidv4(),
							chatId: newChatResult2 as Id<"chats">,
							sender: botMessage.sender,
							message: botMessage.message,
							Answer: response.answer,
							Reasoning: reasoningObject,
							Sources: sources,
							SourceLinks: response.sourceLinks || [],
							Jargons: jargonsObject,
							Info: mainCveId ? {
								cve_id: mainCveId,
								cve_desc: mainCveDesc,
								mitigation: mitigation
							} : (response.contextData && (response.contextData.concept || response.contextData.riskLevels?.[0])) ? {
								cve_id: response.contextData.concept || "General Security Topic",
								cve_desc: `Risk Level: ${response.contextData.riskLevels?.[0] || "Unknown"}. Topic: ${response.contextData.concept || "Security analysis"}`,
								mitigation: mitigation
							} : undefined,
							Severity: "Medium",
							tags: [response.dynamicTag || "cybersecurity_general"]
						});
						console.log('AI response saved to new chat with enhanced data');
						
						// Update URL
						window.history.pushState(
							{ path: `/chatbot/${newChatResult2}` },
							"",
							`/chatbot/${newChatResult2}`,
						);
					} catch (chatCreateError) {
						console.error('Failed to create new chat:', chatCreateError);
					}
				}
				
				console.log('Adding botMessage to UI with jargons:', {
					hasJargons: !!botMessage.jargons,
					jargonsCount: botMessage.jargons?.length || 0,
					jargons: botMessage.jargons,
					hasSourceLinks: !!botMessage.sourceLinks,
					sourceLinksCount: botMessage.sourceLinks?.length || 0
				});
				setMessages((prev) => [...prev, botMessage]);
				setIsLoading(false);
				setAgentButtonsDisabled(false); // Re-enable agent buttons
			} catch (error) {
				setIsLoading(false);
				setAgentButtonsDisabled(false); // Re-enable agent buttons on error
				showErrorToast('Failed to get answer.');
			}
		}
	};

	const processManualMessages = async (
		userMessage: Message,
		botMessage: Message,
	) => {
		const latestMessage = [userMessage, botMessage];
		const response = await handleTitleGeneration(botMessage.message);

		const result = await saveChat({
			userId: String((response as { userId: string }).userId),
			title: (response as { title: string })?.title,
		});

		setCreatedChatId(result);

		for (const msg of latestMessage) {
			await saveChatMessage({
				chatId: result,
				humanInTheLoopId: msg.id,
				sender: msg.sender,
				message: msg.message,
			});
		}
		window.history.pushState(
			{ path: `/chatbot/${result}` },
			"",
			`/chatbot/${result}`,
		);
	};

	const requestHumanApproval = async (
		action: string, // action for the approval message
		prompt: string, // prompt to show to the human
		type?: string, // type of action to perform [none for options] [action type for approval]
		id?: string, // id to link the approval message to the action
		updatedOptions?: {
			name: string;
			id: string;
			type: string;
			description: string;
		}[], // options to show to the human
	) => {
		let approvalMessage = "";
		if (action === "scan") {
			approvalMessage = "You can choose from the following:";
			if (updatedOptions) {
				setActionPrompts(updatedOptions);
				setInfo(updatedOptions);
			}
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "github-scan") {
			approvalMessage =
				"Select type of github repository. You can choose from the following:";
			setActionPrompts(GITHUB_SCAN);
			setInfo(GITHUB_SCAN);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "standards") {
			approvalMessage =
				"Select your preferred standard for the scan. You can choose from the following:";
			setActionPrompts(STANDARDS);
			setInfo(STANDARDS);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "report") {
			approvalMessage = "What type of report do you want to generate?";
			setActionPrompts(REPORTS);
			setInfo(REPORTS);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "approval") {
			approvalMessage = prompt;
			setActionPrompts([]);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "folder") {
			approvalMessage =
				"Select or create a folder where you want to save the scan report.";
			const folders = foldersList.map((folder) => {
				if (folder.type === "folder") {
					return { ...folder, type: "scan-summary" }; // Change type to "chat-summary"
				}
				return folder; // Return the folder unchanged if type is not "folder"
			});
			setActionPrompts(folders);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "folder-sast") {
			approvalMessage =
				"Select or create a folder where you want to save the scan report.";
			const folders = foldersList.map((folder) => {
				if (folder.type === "folder") {
					return { ...folder, type: "scan-sast-summary" };
				}
				return folder; // Return the folder unchanged if type is not "folder"
			});
			setActionPrompts(folders);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "save-chat-summary") {
			approvalMessage =
				"Select or create a folder where you want to save the chat summary report.";
			const folders = foldersList.map((folder) => {
				if (folder.type === "folder") {
					return { ...folder, type: "chat-summary" }; // Change type to "chat-summary"
				}
				return folder; // Return the folder unchanged if type is not "folder"
			});
			setActionPrompts(folders);
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "input") {
			approvalMessage = "Please enter the file name for the report";
			setHumanInTheLoopMessage(approvalMessage);
		} else if (action === "sast-input") {
			approvalMessage = "Please enter the access token of github repository";
			setHumanInTheLoopMessage(approvalMessage);
		} else {
			approvalMessage = "You can choose from the following options";
			if (updatedOptions) {
				setActionPrompts(updatedOptions);
				setInfo(updatedOptions);
			}
			setHumanInTheLoopMessage(approvalMessage);
		}
		const approvalMessageObject: Message = {
			id: id,
			message: prompt,
			sender: "ai",
			actionType: action,
			confirmType: type,
			humanInTheLoopMessage: approvalMessage,
		};

		setActionType(action);
		setConfirmType(type || null);

		setMessages((prev) => [...prev, approvalMessageObject]);
	};

	const [showInfo, setShowInfo] = useState(false);

	const confirmAction = async (
		action: string, //action name
		type: string, //action type
		actionId?: string, //action id
	) => {
		if (!pendingAction) return;

		const userMessage: Message = {
			id: uuidv4(),
			message: action,
			sender: "user",
		};

		if (type === "scan") {
			setScanType(action);
			try {
				setMessages((prev) => [...prev, userMessage]);
				await saveChatMessage({
					humanInTheLoopId: userMessage.id,
					chatId: chatId
						? (chatId as Id<"chats">)
						: (createdChatId as Id<"chats">),
					sender: userMessage.sender,
					message: userMessage.message,
				});
				//message to pop after HIT
				const manualMessage =
					"Thank you for providing the scan type. Please select the standard you want to scan against.";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};
				setPendingAction(botMessage.id as string);
				await saveChatMessage({
					humanInTheLoopId: botMessage.id,
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setRequestHumanInLoop({
					action: "standards",
					prompt: manualMessage,
					type: "none",
					id: botMessage.id,
				});
				requestHumanApproval("standards", manualMessage, "none", botMessage.id);
			} catch {
				addBotMessage("An error occurred while processing your request.");
			}
		} else if (type === "github-scan") {
			setScanType(action);
			if (action === "Private Repository") {
				try {
					setMessages((prev) => [...prev, userMessage]);
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: chatId
							? (chatId as Id<"chats">)
							: (createdChatId as Id<"chats">),
						sender: userMessage.sender,
						message: userMessage.message,
					});
					//message to pop after HIT
					const manualMessage = "Thank you for selecting type of repository.";
					const botMessage: Message = {
						id: uuidv4(),
						message: manualMessage,
						sender: "ai",
					};
					setPendingAction(botMessage.id as string);
					await saveChatMessage({
						humanInTheLoopId: botMessage.id,
						chatId: createdChatId
							? (createdChatId as Id<"chats">)
							: (chatId as Id<"chats">),
						sender: botMessage.sender,
						message: botMessage.message,
					});
					setRequestHumanInLoop({
						action: "sast-input",
						prompt: manualMessage,
						type: "github-scan",
						id: botMessage.id,
					});
					requestHumanApproval(
						"sast-input",
						manualMessage,
						"github-scan",
						botMessage.id,
					);
				} catch {
					addBotMessage("An error occurred while processing your request.");
				}
			} else {
				try {
					setMessages((prev) => [...prev, userMessage]);
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: chatId
							? (chatId as Id<"chats">)
							: (createdChatId as Id<"chats">),
						sender: userMessage.sender,
						message: userMessage.message,
					});
					//scan api call
					try {
						let payload: {
							githubUrl: string;
							repoType: string;
							accessToken?: string;
							userId: string | null | undefined;
						};
						if (action === "Public Repository") {
							payload = {
								githubUrl: targetUrl as string,
								repoType: "public",
								userId: user?.id,
							};
						} else {
							payload = {
								githubUrl: targetUrl as string,
								accessToken: action as string,
								repoType: "private",
								userId: user?.id,
							};
						}
						setPendingAction(null);
						setIsScanLoading(true);
						setProgress(0);
						setProgressLoaderMessage("Scanning in progress...");

						const totalSteps = 20;
						const stepDelay = 500;
						// Create the progress animation promise
						const progressAnimation = (async () => {
							for (let i = 0; i < totalSteps; i++) {
								await new Promise((resolve) => setTimeout(resolve, stepDelay));
								setProgress(
									(prevProgress) =>
										Math.min(prevProgress + 100 / totalSteps, 95), // Stop at 95% until API completes
								);
							}
						})();

						// Run both the animation and API call
						const [response] = await Promise.all([
							scanApis.scanWithGithubURL(payload),
							progressAnimation,
						]);
						setProgress(100);
						setScanSastResponse(response.data);
						addBotMessage(
							`Scan completed successfully. Found **${response.data.issues.length}** issues and **${response.data.hotspots.length}** hotspots.`,
						);
					} catch (error) {
						addBotMessage("An error occurred while processing your request.");
						return error;
					} finally {
						setIsScanLoading(false);
					}

					const manualMessage = "Do you want to generate a brief summary?";
					const botMessage: Message = {
						id: uuidv4(),
						message: manualMessage,
						sender: "ai",
					};

					await saveChatMessage({
						chatId: createdChatId
							? (createdChatId as Id<"chats">)
							: (chatId as Id<"chats">),
						humanInTheLoopId: botMessage.id,
						sender: botMessage.sender,
						message: botMessage.message,
					});

					setPendingAction(botMessage.id as string);
					setRequestHumanInLoop({
						action: "approval",
						prompt: manualMessage,
						type: "sast-report",
						id: botMessage.id,
					});
					requestHumanApproval(
						"approval",
						manualMessage,
						"sast-report",
						botMessage.id,
					);
				} catch {
					addBotMessage("An error occurred while processing your request.");
				}
			}
		} else if (type === "standards") {
			try {
				setMessages((prev) => [...prev, userMessage]);
				await saveChatMessage({
					humanInTheLoopId: userMessage.id,
					chatId: chatId
						? (chatId as Id<"chats">)
						: (createdChatId as Id<"chats">),
					sender: userMessage.sender,
					message: userMessage.message,
				});
				//scan api call
				try {
					const payload = {
						url: targetUrl as string,
						complianceStandard: action as string,
						scanType: scanType as string,
						userId: Number(user?.id),
					};
					setPendingAction(null);
					setIsScanLoading(true);
					setProgress(0);
					setProgressLoaderMessage("Scanning in progress...");

					const totalSteps = 20;
					const stepDelay = 500;

					// Create the progress animation promise
					const progressAnimation = (async () => {
						for (let i = 0; i < totalSteps; i++) {
							await new Promise((resolve) => setTimeout(resolve, stepDelay));
							setProgress(
								(prevProgress) => Math.min(prevProgress + 100 / totalSteps, 95), // Stop at 95% until API completes
							);
						}
					})();

					// Running both the animation and API call
					const [response] = await Promise.all([
						scanApis.scanWithProgress(payload),
						progressAnimation,
					]);

					setProgress(100);
					setScanResponse(response.data);

					addBotMessage(
						`Scan completed using **${response.data.complianceStandardUrl}**. Found **${response.data.totals.totalIssues}** vulnerabilities.`,
					);
				} catch (error) {
					addBotMessage("An error occurred while processing your request.");
					return error;
				} finally {
					setIsScanLoading(false);
				}

				const manualMessage = "Do you want to generate a brief summary?";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "approval",
					prompt: manualMessage,
					type: "report",
					id: botMessage.id,
				});
				requestHumanApproval(
					"approval",
					manualMessage,
					"report",
					botMessage.id,
				);
			} catch {
				addBotMessage("An error occurred while processing your request.");
			}
		} else if (type === "report") {
			if (action === "Chat Summary Report") {
				if (createdChatId) {
					setMessages((prev) => [...prev, userMessage]);
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: createdChatId as Id<"chats">,
						sender: userMessage.sender,
						message: userMessage.message,
					});
				} else {
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: chatId as Id<"chats">,
						sender: userMessage.sender,
						message: userMessage.message,
					});
				}
				setPendingAction(null);
				const payload = {
					messages: messages.map((msg) => msg.message),
				};
				const responseStream = (await chatApis.chatSummaryOpenAI(
					payload,
				)) as StreamResponse;

				await streamChatResponse(
					userMessage,
					responseStream as StreamResponse,
					action as string,
				);
				const manualMessage =
					"Do you want to save this as a detailed Chat Summary report?";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "approval",
					prompt: manualMessage,
					type: "save-chat-summary",
					id: botMessage.id,
				});

				requestHumanApproval(
					"approval",
					manualMessage,
					"save-chat-summary",
					botMessage.id,
				);
			} else if (action === "Vulnerability Report") {
				if (createdChatId) {
					setMessages((prev) => [...prev, userMessage]);
				} else {
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: chatId as Id<"chats">,
						sender: userMessage.sender,
						message: userMessage.message,
					});
				}
				setPendingAction(null);
				const manualMessage = "Thank you for your response";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				setPendingAction(botMessage.id as string);

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});
				if (!targetUrl) {
					addBotMessage("Please provide a URL to scan");
					setPendingAction(null);
					return;
				}

				setRequestHumanInLoop({
					action: "standards",
					prompt: manualMessage,
					type: "none",
					id: botMessage.id,
				});
				requestHumanApproval("standards", manualMessage, "none", botMessage.id);
			}
		} else if (type === "scan-summary") {
			// Folder selection

			if (action === "Create New Folder") {
				setIsCreateDialogOpen(true);
				setRequestHumanInLoop({
					action: "input",
					type: "create-file",
				});
			} else {
				setFolderId(actionId as string);
				const manualMessage = "Thank you for providing the file name";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "input",
					prompt: manualMessage,
					type: "create-file",
					id: botMessage.id,
				});
				requestHumanApproval(
					"input",
					manualMessage,
					"create-file",
					botMessage.id,
				);
			}
		} else if (type === "chat-summary") {
			if (action === "Create New Folder") {
				setRequestHumanInLoop({
					action: "input",
					type: "chat-summary-create-file",
				});
				setIsCreateDialogOpen(true);
			} else {
				setFolderId(actionId as string);
				const manualMessage = "Thank you for providing the file name";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};
				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});
				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "input",
					prompt: manualMessage,
					type: "chat-summary-create-file",
					id: botMessage.id,
				});
				requestHumanApproval(
					"input",
					manualMessage,
					"chat-summary-create-file",
					botMessage.id,
				);
			}
		} else if (type === "scan-sast-summary") {
			// Folder selection
			if (action === "Create New Folder") {
				setIsCreateDialogOpen(true);
				setRequestHumanInLoop({
					action: "input",
					type: "create-file",
				});
			} else {
				setFolderId(actionId as string);
				const manualMessage = "Thank you for providing the file name";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "input",
					prompt: manualMessage,
					type: "sast-summary-create-file",
					id: botMessage.id,
				});
				requestHumanApproval(
					"input",
					manualMessage,
					"sast-summary-create-file",
					botMessage.id,
				);
			}
		} else if (type === "create-file" && action) {
			let markDownContent = "";
			try {
				setPendingAction(null);
				setIsScanLoading(true);
				setProgress(0);
				setProgressLoaderMessage("Generating report");

				const totalSteps = 10;
				const stepDelay = 500;

				// Create the progress animation promise
				const progressAnimation = (async () => {
					for (let i = 0; i < totalSteps; i++) {
						await new Promise((resolve) => setTimeout(resolve, stepDelay));
						setProgress(
							(prevProgress) => Math.min(prevProgress + 100 / totalSteps, 95), // Stop at 95% until API completes
						);
					}
				})();

				// Run both the animation and API call
				const [response] = await Promise.all([
					scanApis.detailedReportGeneration(scanResponse),
					progressAnimation,
				]);

				setProgress(100);

				setIsScanLoading(true);

				markDownContent = response.data.response;
				const fileId = await saveFile({
					fileName: action,
					fileUrl: "randomUrl",
					folderId: folderId as Id<"reportFolders">,
					reportType: "vulnerabilityReport",
					markdownContent: markDownContent,
				});

				const fileLink = `/file/${fileId}`;
				const message = `Report saved successfully. Click [here](${fileLink}) to view the report.`;

				addBotMessage(message);
			} catch (error) {
				return error;
			} finally {
				setIsScanLoading(false);
			}
		} else if (type === "chat-summary-create-file" && action) {
			let markDownContent = "";
			try {
				setPendingAction(null);
				setIsScanLoading(true);
				setProgress(0);
				if (!chatSummaryContent) {
					throw new Error("No chat summary available");
				}
				markDownContent = chatSummaryContent;
			} catch (error) {
				return error;
			} finally {
				setIsScanLoading(false);
			}
			const fileId = await saveFile({
				fileName: action,
				fileUrl: "randomUrl",
				folderId: folderId as Id<"reportFolders">,
				reportType: "chatSummaryReport",
				markdownContent: markDownContent,
			});
			const fileLink = `/file/${fileId}`;
			const message = `Report saved successfully. Click [here](${fileLink}) to view the report.`;
			setChatSummaryContent("");
			addBotMessage(message);
			setPendingAction(null);
		} else if (type === "sast-summary-create-file" && action) {
			let markDownContent = "";
			try {
				setPendingAction(null);
				setIsScanLoading(true);
				setProgress(0);
				setProgressLoaderMessage("Generating report");

				const totalSteps = 10;
				const stepDelay = 500;

				// Create the progress animation promise
				const progressAnimation = (async () => {
					for (let i = 0; i < totalSteps; i++) {
						await new Promise((resolve) => setTimeout(resolve, stepDelay));
						setProgress(
							(prevProgress) => Math.min(prevProgress + 100 / totalSteps, 95), // Stop at 95% until API completes
						);
					}
				})();

				// Run both the animation and API call
				const [response] = await Promise.all([
					scanApis.detailedSastReportGeneration(scanSastResponse),
					progressAnimation,
				]);

				setProgress(100);

				setIsScanLoading(true);

				markDownContent = response.data.response;
				const fileId = await saveFile({
					fileName: action,
					fileUrl: "randomUrl",
					folderId: folderId as Id<"reportFolders">,
					reportType: "vulnerabilityReport",
					markdownContent: markDownContent,
				});

				const fileLink = `/file/${fileId}`;
				const message = `Report saved successfully. Click [here](${fileLink}) to view the report.`;

				addBotMessage(message);
			} catch (error) {
				return error;
			} finally {
				setIsScanLoading(false);
			}
		} else {
			setPendingAction(null);
			handleSend(userMessage.message);
			// processPrompt(userMessage);
		}
	};

	const streamChatResponse = async (
		userMessage: Message,
		responseStream: StreamResponse,
		action?: string,
	) => {
		try {
			setStreaming(true);

			if (!responseStream.ok || !responseStream.body) {
				throw new Error("Failed to get response stream");
			}

			const reader = responseStream.body.getReader();
			const decoder = new TextDecoder();
			let accumulatedMessage = "";
			let humanAction = "";
			let humanOptions: { option: string; description: string }[] = [];
			let question = "";

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					setIsLoading(false);
					if (!accumulatedMessage && humanAction !== "sendRagQuery") {
						accumulatedMessage = question;
					}

					await completeMessage();

					const botMessage: Message = {
						id: uuidv4(),
						message: accumulatedMessage,
						sender: "ai",
					};

					handleMessagesUpdate([userMessage, botMessage]);

					if (humanAction === "sendRagQuery") {
						try {
							setIsLoading(true);
							const response = await ragApis.sendRagQuery(question);
							addBotMessage(response.data.answer);
						} catch (error) {
							return error;
						} finally {
							setIsLoading(false);
						}
					} else if (humanAction === "sendEmail") {
						const manualMessage = "Please select either yes or no";
						setPendingAction(botMessage.id as string);
						requestHumanApproval(
							"approval",
							manualMessage,
							"email",
							botMessage.id,
						);
					} else if (humanAction === "select_scan_option") {
						const updatedScanTypes = SCANTYPES.map((scanType, index) => ({
							...scanType,
							name: humanOptions[index].option,
						}));

						const manualMessage =
							"Thank you for providing the scan type. Please select the standard you want to scan against.";

						setPendingAction(botMessage.id as string);

						requestHumanApproval(
							"scan",
							manualMessage,
							"none",
							botMessage.id,
							updatedScanTypes,
						);
					} else if (humanAction === "select_general_option") {
						const updatedOptions = humanOptions?.map((options, index) => ({
							id: String(index),
							type: options.option,
							name: options.option,
							description: options.description,
						}));

						setPendingAction(botMessage.id as string);

						requestHumanApproval(
							"random",
							"Human in the loop Action Completed",
							"none",
							botMessage.id,
							updatedOptions,
						);
					}

					//addd toolcall completion here

					if (action === "Chat Summary Report") {
						setChatSummaryContent(accumulatedMessage);
						await saveSummary({
							userId: String(user?.id),
							title: `Chat Summary - ${new Date().toLocaleDateString()}`,
							content: accumulatedMessage,
						});
					}
					break;
				}

				if (value) {
					const chunkText = decoder.decode(value, { stream: true });

					accumulatedMessage += chunkText;
					try {
						const parsed = JSON.parse(chunkText);

						if (parsed.type === "tool_call") {
							setIsLoading(true);

							humanAction = parsed.data.name;

							const options = parsed.data.arguments.options;

							humanOptions = options;

							question = parsed.data.arguments.question;
							accumulatedMessage = question;
						}
					} catch {
						// Not JSON, use as regular text
						accumulatedMessage += "";
					}

					updateUI(accumulatedMessage);
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			addBotMessage(`Error: ${errorMessage}`);
		} finally {
			setStreaming(false);
			setIsLoading(false);
		}
	};

	const yesClicked = async (confirmType: string) => {
		setPendingAction(null);
		const userMessage: Message = {
			id: uuidv4(),
			message: "Yes",
			sender: "user",
		};
		setMessages((prev) => [...prev, userMessage]);
		if (confirmType === "report") {
			await saveChatMessage({
				humanInTheLoopId: userMessage.id,
				chatId: chatId
					? (chatId as Id<"chats">)
					: (createdChatId as Id<"chats">),
				sender: userMessage.sender,
				message: userMessage.message,
			});

			try {
				setIsLoading(true);
				//report generation api call
				const responseStream =
					await scanApis.scanReportGeneration(scanResponse);
				setIsLoading(false);

				await streamChatResponse(userMessage, responseStream);

				const manualMessage = "Do you want to save this as a detailed report?";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "approval",
					prompt: manualMessage,
					type: "save",
					id: botMessage.id,
				});
				requestHumanApproval("approval", manualMessage, "save", botMessage.id);
			} catch (error) {
				return error;
			}
		}
		if (confirmType === "sast-report") {
			await saveChatMessage({
				humanInTheLoopId: userMessage.id,
				chatId: chatId
					? (chatId as Id<"chats">)
					: (createdChatId as Id<"chats">),
				sender: userMessage.sender,
				message: userMessage.message,
			});

			try {
				setIsLoading(true);
				//report generation api call
				const responseStream =
					await scanApis.scanSastReportGeneration(scanSastResponse);
				setIsLoading(false);

				await streamChatResponse(userMessage, responseStream);

				const manualMessage = "Do you want to save this as a detailed report?";
				const botMessage: Message = {
					id: uuidv4(),
					message: manualMessage,
					sender: "ai",
				};

				await saveChatMessage({
					chatId: createdChatId
						? (createdChatId as Id<"chats">)
						: (chatId as Id<"chats">),
					humanInTheLoopId: botMessage.id,
					sender: botMessage.sender,
					message: botMessage.message,
				});

				setPendingAction(botMessage.id as string);
				setRequestHumanInLoop({
					action: "approval",
					prompt: manualMessage,
					type: "save-sast-summary",
					id: botMessage.id,
				});
				requestHumanApproval(
					"approval",
					manualMessage,
					"save-sast-summary",
					botMessage.id,
				);
			} catch (error) {
				return error;
			}
		} else if (confirmType === "save") {
			await saveChatMessage({
				humanInTheLoopId: userMessage.id,
				chatId: chatId
					? (chatId as Id<"chats">)
					: (createdChatId as Id<"chats">),
				sender: userMessage.sender,
				message: userMessage.message,
			});
			const manualMessage = "Thank you for folder name";
			const botMessage: Message = {
				id: uuidv4(),
				message: manualMessage,
				sender: "ai",
			};
			await saveChatMessage({
				chatId: createdChatId
					? (createdChatId as Id<"chats">)
					: (chatId as Id<"chats">),
				humanInTheLoopId: botMessage.id,
				sender: botMessage.sender,
				message: botMessage.message,
			});

			setPendingAction(botMessage.id as string);
			setRequestHumanInLoop({
				action: "folder",
				prompt: manualMessage,
				type: "none",
				id: botMessage.id,
			});
			requestHumanApproval("folder", manualMessage, "none", botMessage.id);
		} else if (confirmType === "save-chat-summary") {
			await saveChatMessage({
				humanInTheLoopId: userMessage.id,
				chatId: chatId
					? (chatId as Id<"chats">)
					: (createdChatId as Id<"chats">),
				sender: userMessage.sender,
				message: userMessage.message,
			});

			const manualMessage = "Thank you for folder name.";
			const botMessage: Message = {
				id: uuidv4(),
				message: manualMessage,
				sender: "ai",
			};
			await saveChatMessage({
				chatId: createdChatId
					? (createdChatId as Id<"chats">)
					: (chatId as Id<"chats">),
				humanInTheLoopId: botMessage.id,
				sender: botMessage.sender,
				message: botMessage.message,
			});

			setPendingAction(botMessage.id as string);
			setRequestHumanInLoop({
				action: "save-chat-summary",
				prompt: manualMessage,
				type: "summary",
				id: botMessage.id,
			});

			requestHumanApproval(
				"save-chat-summary",
				manualMessage,
				"summary",
				botMessage.id,
			);
		} else if (confirmType === "save-sast-summary") {
			await saveChatMessage({
				humanInTheLoopId: userMessage.id,
				chatId: chatId
					? (chatId as Id<"chats">)
					: (createdChatId as Id<"chats">),
				sender: userMessage.sender,
				message: userMessage.message,
			});

			const manualMessage = "Thank you for folder name.";
			const botMessage: Message = {
				id: uuidv4(),
				message: manualMessage,
				sender: "ai",
			};
			await saveChatMessage({
				chatId: createdChatId
					? (createdChatId as Id<"chats">)
					: (chatId as Id<"chats">),
				humanInTheLoopId: botMessage.id,
				sender: botMessage.sender,
				message: botMessage.message,
			});

			setPendingAction(botMessage.id as string);
			setRequestHumanInLoop({
				action: "folder-sast",
				prompt: manualMessage,
				type: "non",
				id: botMessage.id,
			});

			requestHumanApproval("folder-sast", manualMessage, "none", botMessage.id);
		} else if (confirmType === "email") {
			const response = await ragApis.getLatestCVEs();
			const { cveIds } = response.data;
			const uniqueCveList = [...new Set(cveIds)];

			const agentPayload: TriggerAgentData = {
				emailId: user?.email || "",
				cveIds: uniqueCveList as string[],
			};

			// Running ai agent API in background
			void (async () => {
				try {
					showInfoToast("Processed CVEs and triggering AI Agent");
					await agentApi.triggerAgent(agentPayload);
					showSuccessToast(
						"Please check your email for the Vulnerability Insights.",
					);
				} catch (error) {
					showErrorToast("Agent trigger failed. Please try again.");

					return error;
				}
			})();
		}
	};

	const cancelAction = async () => {
		setPendingAction(null);
		const userMessage: Message = {
			id: uuidv4(),
			message: "No",
			sender: "user",
		};
		setMessages((prev) => [...prev, userMessage]);
		await saveChatMessage({
			humanInTheLoopId: userMessage.id,
			chatId: chatId ? (chatId as Id<"chats">) : (createdChatId as Id<"chats">),
			sender: userMessage.sender,
			message: userMessage.message,
		});
		setChatSummaryContent("");
		// processPrompt(userMessage);
		// addBotMessage("Action cancelled. How else can I assist you?");
	};

	const addBotMessage = async (message: string) => {
		const botMessage: Message = { id: uuidv4(), message, sender: "ai" };
		setMessages((prev) => [...prev, botMessage]);

		await saveChatMessage({
			humanInTheLoopId: botMessage.id,
			chatId: createdChatId
				? (createdChatId as Id<"chats">)
				: (chatId as Id<"chats">),
			sender: botMessage.sender,
			message: botMessage.message,
		});
	};

	const generateTitle = async (botMessage: string) => {
		try {
			const { data } = await chatApis.generateTitle({
				botMessage: botMessage,
			});

			return { title: data.response, userId: user?.id };
		} catch (error) {
			return error;
		}
	};

	const handleActionSend = (action: string, useRAG?: boolean) => {
		handleSend(action, useRAG);
	};

	const handleSend = async (message?: string, useRAG?: boolean, isRelatedQuestion = false) => {
		const finalMessage = message || input.trim();
		if (finalMessage) {
			// Record the time when AI will start thinking
			thinkingStartRef.current = Date.now();

			const userMessage: Message = {
				id: uuidv4(),
				message: finalMessage,
				sender: "user",
				isRelatedQuestion: isRelatedQuestion,
			};
			// Always optimistically add the user message
			setMessages((prev) => {
				if (prev.some(m => m.id === userMessage.id)) return prev;
				return [...prev, userMessage];
			});
			setInput("");
			if (createdChatId || chatId) {
				setFetchChatsRegurlarly(false);
				try {
					await saveChatMessage({
						humanInTheLoopId: userMessage.id,
						chatId: createdChatId
							? (createdChatId as Id<"chats">)
							: (chatId as Id<"chats">),
						sender: userMessage.sender,
						message: userMessage.message,
					});
					// Always use GraphRAG for cybersecurity questions
					processPrompt(userMessage, true);
				} catch (error) {
					return error;
				}
			} else {
				// Always use GraphRAG for cybersecurity questions
				processPrompt(userMessage, true);
			}
		}
	};

	const updateUI = (message: string) => {
		setMessages((prev) => {
			const lastMessage = prev[prev.length - 1];
			if (lastMessage?.sender === "ai" && lastMessage.isStreaming) {
				return [...prev.slice(0, -1), { ...lastMessage, message: message }];
			}

			return [
				...prev,
				{
					id: uuidv4(),
					message: message,
					sender: "ai",
					isStreaming: true,
				},
			];
		});
	};

	const handleMessagesUpdate = async (updatedMessages: Message[]) => {
		const lastMessage = updatedMessages[updatedMessages.length - 1];
		const chatId = createdChatId;
		if (!chatId && !createdChatId) {
			const response = await handleTitleGeneration(lastMessage.message);
			const result = await saveChat({
				userId: String((response as { userId: string }).userId),
				title: (response as { title: string })?.title,
			});
			setCreatedChatId(result);

			// Save all messages
			for (const msg of updatedMessages) {
				await saveChatMessage({
					chatId: result,
					humanInTheLoopId: msg.id,
					sender: msg.sender,
					message: msg.message,
				});
			}

			window.history.pushState(
				{ path: `/chatbot/${result}` },
				"",
				`/chatbot/${result}`,
			);
		} else {
			// Handle existing chat
			const targetChatId = createdChatId || chatId;

			if (targetChatId) {
				await saveChatMessage({
					humanInTheLoopId: lastMessage.id,
					chatId: targetChatId as Id<"chats">,
					sender: "ai",
					message: lastMessage.message,
				});
			}
		}
		return;
	};

	const completeMessage = async () => {
		setMessages((prev) => {
			const updatedMessages = prev.map((msg) =>
				msg.isStreaming ? { ...msg, isStreaming: false } : msg,
			);

			return updatedMessages;
		});
	};

	const handleFileCreation = async (
		selectedAction: string,
		action: RequestHumanInLoop | null,
	) => {
		if (action) {
			await confirmAction(selectedAction, action.type ?? "create-file");
		}
	};

	useEffect(() => {
		if (allRelatedQuestionsThisRender.length > 0) {
			setShownRelatedQuestions(prev => Array.from(new Set([...prev, ...allRelatedQuestionsThisRender])));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]);

	// Find the index of the last AI message
	const lastAiIndex = [...messages].reverse().findIndex(m => m.sender === "ai");
	const lastAiMessageIdx = lastAiIndex === -1 ? -1 : messages.length - 1 - lastAiIndex;

	// Add duplicate ID check before rendering
	const idSet = new Set();
	messages.forEach(m => {
		if (idSet.has(m.id)) {
			console.warn('Duplicate message id detected:', m.id);
		}
		idSet.add(m.id);
	});

	// Filter out duplicate message IDs before rendering
	const uniqueMessages: Message[] = [];
	const seenIds = new Set();
	for (const msg of messages) {
		if (!seenIds.has(msg.id)) {
			uniqueMessages.push(msg);
			seenIds.add(msg.id);
		}
	}

	return (
		<div className="flex justify-center">
			<div className="flex flex-col space-y-3 sm:w-3/4 md:w-4/5 lg:w-3/5 h-[89vh] rounded-lg">
				{uniqueMessages.length === 0 ? (
					<div className="flex flex-col items-center justify-end w-full lg:h-1/3 md:h-1 sm:h-full p-4 sm:p-8">
						<motion.div
							className="flex flex-col items-center text-center text-xl sm:text-2xl font-semibold mt-4 sm:mt-6 space-y-1 sm:space-y-1"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						/>
					</div>
				) : chatsLoader ? (
					<div className="flex items-center justify-center w-full h-full">
						<Spinner />
					</div>
				) : (
					<ScrollArea
						ref={scrollAreaRef}
						className="flex-1 p-4 w-full overflow-y-hidden"
					>
						{uniqueMessages.map((message, idx) => {
							const isPendingAction =
								pendingAction === message.id ||
								pendingAction === message.humanInTheLoopId;
							const isAISender = message.sender === "ai";

							if (isPendingAction && isAISender) {
								return actionType === "approval" ? (
									<motion.div
										key={message.id + '-' + idx}
										initial={{ opacity: 0, y: 50 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -50 }}
										transition={{ duration: 0.3 }}
									>
										<HumanInTheLoopApproval
											addBotMessage={addBotMessage}
											key={message.id}
											message={humanInTheLoopMessage || ""}
											onCancel={cancelAction}
											confirmType={confirmType || ""}
											onConfirm={yesClicked}
										/>
									</motion.div>
								) : actionType === "input" || actionType === "sast-input" ? (
									<motion.div
										key={message.id + '-' + idx}
										initial={{ opacity: 0, y: 50 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -50 }}
										transition={{ duration: 0.3 }}
									>
										<HumanInTheLoopInput
											addBotMessage={addBotMessage}
											key={message.id}
											message={humanInTheLoopMessage || ""}
											onConfirm={handleFileCreation}
											setShowInfo={setShowInfo}
											requestHumanInLoop={requestHumanInLoop ?? null}
										/>
									</motion.div>
								) : (
									<motion.div
										key={message.id + '-' + idx}
										initial={{ opacity: 0, y: 50 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -50 }}
										transition={{ duration: 0.3 }}
									>
										<HumanInTheLoopOptions
											addBotMessage={addBotMessage}
											key={message.id}
											setShowInfo={setShowInfo}
											question={humanInTheLoopMessage || ""}
											actionPrompts={actionPrompts || []}
											onConfirm={confirmAction}
										/>
									</motion.div>
								);
							}

							const isUser = message.sender === "user";
							const messageClasses = `inline-block px-3 pt-3 rounded-xl max-w-[80%] sm:max-w-[100%] ${
								isUser
									? "bg-secondary dark:bg-primary-900 p-4 text-sm"
									: "text-foreground pr-4 overflow-y-auto text-pretty break-normal text-sm"
							}`;
							const containerClasses = `mb-4  ${isUser ? "text-right" : "text-left"}`;

							// Before rendering related questions:
							const lastUserMsg = uniqueMessages.slice(0, idx).reverse().find(m => m.sender === 'user');
							const userQuestion = lastUserMsg ? lastUserMsg.message : '';
							const contextKey = (userQuestion + ' ' + message.message).toLowerCase();
							let relatedQuestions = getRelatedQuestions(
								userQuestion,
								message.message,
								message.reasoningTrace ? JSON.stringify(message.reasoningTrace) : '',
								uniqueMessages
							);
							const shownForThisContext = contextToShownQuestions[contextKey] || [];
							relatedQuestions = relatedQuestions.filter(q => !shownForThisContext.includes(q));
							allRelatedQuestionsThisRender.push(...relatedQuestions);

							// If fewer than 3, fill with least recently shown for this context (but not currently visible)
							if (relatedQuestions.length < 3) {
								const fillQuestions = shownForThisContext.filter(q => !relatedQuestions.includes(q));
								relatedQuestions = [...relatedQuestions, ...fillQuestions.slice(0, 3 - relatedQuestions.length)];
							}
							// After filling with least recently shown, if still less than 3, fill with generic fallbacks (ensuring no duplicates)
							const fallbackQuestions = [
								'What are common risks?',
								'How can I prevent this?',
								'Can you give an example?'
							];
							if (relatedQuestions.length < 3) {
								const alreadyUsed = new Set(relatedQuestions);
								for (const q of fallbackQuestions) {
									if (relatedQuestions.length >= 3) break;
									if (!alreadyUsed.has(q)) {
										relatedQuestions.push(q);
										alreadyUsed.add(q);
									}
								}
							}
							relatedQuestions = relatedQuestions.slice(0, 3);

							// Only show related questions for the very last message if it is an AI message
							const isLastMessage = idx === uniqueMessages.length - 1;

							return (
								<motion.div
									key={message.id + '-' + idx}
									className={containerClasses}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1, y: 0 }}
								>
									<div
										className={`items-center ${message.sender === "ai" ? "flex space-x-3" : ""}`}
									>
										{message.sender === "ai" && (
											<img
												src={mira_logo}
												alt="Avatar"
												className="w-5 h-5 mt-3 object-cover rounded-full justify-self-center mb-auto"
											/>
										)}

										<div className={`${messageClasses}`}>
											{isUser ? (
												message.message
											) : (
												<>
													{message.reasoningTrace && message.reasoningTrace.length > 0 && (
														<ReasoningTrace className="mb-2" trace={message.reasoningTrace} durationSec={message.durationSec} />
													)}
													{(() => {
														console.log('Rendering message:', {
															sender: message.sender,
															hasJargons: !!message.jargons,
															jargonsCount: message.jargons?.length || 0,
															messageId: message.id
														});
														return message.jargons ? <div>{highlightJargon(message.message, message.jargons, message.cveDescriptionsMap)}</div> : <MarkdownViewer content={message.message} />;
													})()}
													{message.sourceLinks && message.sourceLinks.length > 0 && (
														<SourceLinks sourceLinks={message.sourceLinks} />
													)}
													{/* Only show related questions for the very last message if it is an AI message */}
													{!isUser && isLastMessage && (
														<div className="mt-3 flex flex-wrap gap-2">
															{relatedQuestions.map((q, i) => (
																<motion.button
																	key={`${message.id}-${q}-${i}`}
																	onClick={() => handleSend(q, false, true)}
																	className="rounded-lg px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-400"
																	style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
																	initial={{ opacity: 0, y: 20 }}
																	animate={{ opacity: 1, y: 0 }}
																	transition={{ delay: 0.15 * i, duration: 0.35, type: 'spring', stiffness: 200 }}
																>
																	{q}
																</motion.button>
															))}
														</div>
													)}
												</>
											)}
										</div>
									</div>
								</motion.div>
							);
						})}

						{isLoading && (
							<motion.div
								initial={{ opacity: 0, y: 50 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -50 }}
								transition={{ duration: 0.3 }}
								className="flex items-center space-x-2 text-gray-500"
							>
								<Spinner />
								<span>Thinking...</span>
							</motion.div>
						)}
					</ScrollArea>
				)}
				{isScanLoading && (
					<div className="space-y-2">
						<Progress value={progress} className="w-full" />

						<p className="text-sm text-center text-gray-500">
							{progress === 95
								? "Almost done..."
								: `${progressLoaderMessage}: ${progress.toFixed(0)}%`}
						</p>
					</div>
				)}
				<div className="flex justify-center w-full">
					<motion.div
						initial={{ width: "70%" }}
						animate={{ width: "90%" }}
						transition={{ duration: 0.3 }}
						className="chat-input flex flex-col p-2 rounded-2xl border border-gray-100 bg-white w-full shadow-sm dark:bg-primary-900 dark:border-gray-700"
					>
						{/* Input Field */}
						<textarea
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							className="w-full text-sm bg-transparent rounded-md h-10 px-3 py-2 text-gray-700 focus:outline-none resize-none"
							placeholder="Type your message here..."
							disabled={isLoading || !!pendingAction}
						/>

						{/* Agent Mode Indicator */}
						{selectedAgentMode && (
							<div className="mb-2 text-center">
								<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
									MIRA Mode: {selectedAgentMode.charAt(0).toUpperCase() + selectedAgentMode.slice(1)}
								</span>
							</div>
						)}

						{/* Buttons Section */}
						<RoleButtonGroup 
							handleActionClick={handleActionSend}
							selectedAgentMode={selectedAgentMode}
							onAgentModeChange={setSelectedAgentMode}
							agentButtonsDisabled={agentButtonsDisabled}
						/>
					</motion.div>
				</div>

				<Dialog open={showInfo} onOpenChange={setShowInfo}>
					<DialogContent className="dialog-content">
						<DialogHeader>
							<DialogTitle className="dialog-title">Information</DialogTitle>
						</DialogHeader>
						<ScrollArea
							style={{
								maxHeight: "400px",
								width: "100%",
								overflowY: "auto",
								scrollbarWidth: "thick",
								scrollbarColor: "#888 #f0f0f0",
							}}
						>
							<div className="dialog-body">
								{info.map((item) => (
									<div key={item.id} className="info-item">
										<h2 className="text-lg font-semibold">{item.name}</h2>
										<p className="info-description">
											{item.description || "No description available."}
										</p>
									</div>
								))}
							</div>
						</ScrollArea>
					</DialogContent>
				</Dialog>
			</div>
			<CreateFolderDialog
				open={isCreateDialogOpen}
				humanInTheLoopAction={requestHumanInLoop}
				onOpenChange={setIsCreateDialogOpen}
				onCreateFolder={handleCreateFolder}
			/>
		</div>
	);
};

export default MiraChatBot;
