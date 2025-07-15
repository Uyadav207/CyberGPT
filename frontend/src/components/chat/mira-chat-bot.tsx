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
import { useSidebar } from "@components/ui/sidebar";

//apis
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { chatApis } from "../../api/chat";
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
import ReasoningCollapsible from "./ReasoningCollapsible";
import AnswerCard from "./AnswerCard";
import ActionButtons from "./ActionButtons";
import SourcesDrawer from "./SourcesDrawer";
import VisualiseDialog from "./VisualiseDialog";
import KGGraph, { colorMap as KGColorMap } from "../graph/KGGraph";
import MiraModularResponse from "./MiraModularResponse";
import axios from "../../api/axios";

// MiraChatBot: Main chat UI for Mira. Handles chat flow, message state, and modular UI for latest AI response.
// Modular UI (MiraModularResponse) is shown only for the latest AI message, with reasoning, AI message, and action buttons.
// All state for reasoning, sources, graph, etc. is managed here and passed as props to the modular component.

const MOCK_SOURCES = [
	{ label: "Common Vulnerabilities and Exposures (CVE) database", url: "https://cve.mitre.org/" },
	{ label: "National Vulnerability Database (NVD)", url: "https://nvd.nist.gov/" },
	{ label: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" }
];
const MOCK_REASONING =
	"This is a mock reasoning. The AI analyzes the context and provides a step-by-step explanation of how the answer was derived, referencing the most relevant sources and knowledge graph relationships.";

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
	const [reasoning, setReasoning] = useState("");
	const [reasoningLoading, setReasoningLoading] = useState(false);
	const [answer, setAnswer] = useState("");
	const [answerTitle, setAnswerTitle] = useState("");
	const [sources, setSources] = useState<any[]>([]);
	const [graphData, setGraphData] = useState<any>(null);
	const [graphExplanation, setGraphExplanation] = useState("");
	const [showSourcesDrawer, setShowSourcesDrawer] = useState(false);
	const [showVisualiseDialog, setShowVisualiseDialog] = useState(false);
	const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
	const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);
	const [enableReasoning, setEnableReasoning] = useState(false);
	const [rightPanel, setRightPanel] = useState<null | 'visualise' | 'references'>(null);
	const [showMoreOptions, setShowMoreOptions] = useState(false);

	// Get sidebar context to control sidebar state
	const { setOpen: setSidebarOpen, open: sidebarOpen } = useSidebar();

	// Action cards for More button
	const moreActionCards = [
		{
			title: "Scan a URL",
			prompt: "Please enter the URL to scan for vulnerabilities.",
			icon: "🔍",
			color: "text-purple-500",
			useRAG: false,
		},
		{
			title: "Scan Github Repository",
			prompt: "Please enter the GitHub repository URL to scan.",
			icon: "🐙",
			color: "text-yellow-500",
			useRAG: false,
		},
		{
			title: "Latest CVE Updates",
			prompt: "Get the latest CVE updates and vulnerability information.",
			icon: "⚠️",
			color: "text-red-500",
			useRAG: true,
		},
		{
			title: "Generate Report",
			prompt: "Select the type of report you want to generate.",
			icon: "📊",
			color: "text-blue-500",
			useRAG: false,
		},
		{
			title: "Security Assessment",
			prompt: "Let me help you assess your security posture.",
			icon: "🛡️",
			color: "text-green-500",
			useRAG: false,
		},
		{
			title: "Compliance Check",
			prompt: "Check compliance with security standards and regulations.",
			icon: "✅",
			color: "text-indigo-500",
			useRAG: false,
		},
	];

	// When right panel opens, close sidebar
	useEffect(() => {
		if (rightPanel) {
			setSidebarOpen(false);
		}
	}, [rightPanel, setSidebarOpen]);

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

	// Get greeting based on the detected time zone
	// const greeting = getGreeting(timeZone);
	const saveChatMessage = useMutation(api.chats.saveChatMessage);
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
			const chatHistory: Message[] = chatData.map(
				(chat: ChatHistory): Message => ({
					id: chat._id,
					humanInTheLoopId: chat.humanInTheLoopId,
					chatId: chat.chatId,
					message: chat.message,
					sender: chat.sender as "user" | "ai",
				}),
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

	const processPrompt = async (userMessage: Message, useRag?: boolean) => {
		setIsLoading(true);
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

		if (hasNegation) {
			const responseStream = (await chatApis.chat({
				message: userMessage.message,
				useRAG: false,
			})) as StreamResponse;

			setIsLoading(false);
			streamChatResponse(userMessage, responseStream as StreamResponse);
		} else if (isClarification) {
			//handled properly
			const responseStream = (await chatApis.chat({
				message: userMessage.message,
				useRAG: false,
			})) as StreamResponse;
			setIsLoading(false);
			streamChatResponse(userMessage, responseStream);
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
				// Always use GraphRAG for RAG queries
				if (useRag) {
					setIsLoading(true);
					try {
						const response = await ragApis.sendGraphRagQuery(userMessage.message);
						const answerContent = response.data?.answer || response.data?.message || "No answer available";
						
						// Store additional data for visualization
						if (response.data?.sources) {
							setSources(response.data.sources);
						}
						if (response.data?.graph_traversal) {
							setGraphData(response.data.graph_traversal);
						}
						if (response.data?.reasoning) {
							setReasoning(response.data.reasoning);
						}
						
						setIsLoading(false);
						setMessages((prev) => [
							...prev,
							{ id: uuidv4(), message: answerContent, sender: "ai" },
						]);
						return;
					} catch (graphRagError: any) {
						setIsLoading(false);
						
						// Handle specific database errors
						if (graphRagError.response?.status === 507) {
							// Database limit exceeded
							const errorMessage = `Database capacity limit reached. ${graphRagError.response.data?.details || 'Please upgrade your Neo4j tier or clean up existing data.'}`;
							showErrorToast(errorMessage);
							setMessages((prev) => [
								...prev,
								{ 
									id: uuidv4(), 
									message: `I'm unable to process your request because the database has reached its capacity limit. ${graphRagError.response.data?.details || 'Please contact support to upgrade your Neo4j tier or clean up existing data.'}`, 
									sender: "ai" 
								},
							]);
							return;
						} else if (graphRagError.response?.status === 503) {
							// Database connection error
							const errorMessage = "Database connection issue. Please try again later.";
							showErrorToast(errorMessage);
							setMessages((prev) => [
								...prev,
								{ 
									id: uuidv4(), 
									message: "I'm experiencing database connection issues. Please try again in a few moments.", 
									sender: "ai" 
								},
							]);
							return;
						} else {
							// Generic error
							const errorMessage = graphRagError.response?.data?.message || graphRagError.message || "An error occurred while processing your request.";
							showErrorToast(errorMessage);
							setMessages((prev) => [
								...prev,
								{ 
									id: uuidv4(), 
									message: `I encountered an error while processing your request: ${errorMessage}`, 
									sender: "ai" 
								},
							]);
							return;
						}
					}
				}
				const previousMessages = messages.map((msg) => ({
					role:
						msg.sender === "user" ? "user" : ("system" as "user" | "system"),
					content: msg.message,
				}));
				setIsLoading(true);
				if (enableReasoning) {
					const response: Response = await chatApis.chat({
						message: userMessage.message,
						useRAG: useRag,
						previousMessages,
						reasoning: enableReasoning,
					});
					const data = await response.json();
					setReasoning(data.reasoning);
					setAnswer(data.answer);
					setIsLoading(false);
					setMessages((prev) => [
						...prev,
						{ id: uuidv4(), message: data.answer, sender: "ai" },
					]);
					return;
				}
				const responseStream: StreamResponse = (await chatApis.chat({
					message: userMessage.message,
					useRAG: useRag,
					previousMessages,
				})) as StreamResponse;
				streamChatResponse(userMessage, responseStream);
				return;
			} catch (error) {
				return error;
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
							// Use GraphRAG (Neo4j) instead of normal RAG
							const response = await ragApis.sendGraphRagQuery(question);
							// The answer may be nested in response.data.answer.content or similar, adjust as needed
							const answerContent = response.data?.answer?.content || response.data?.answer || response.data;
							addBotMessage(answerContent);
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

	const handleSend = async (message?: string, useRAG?: boolean) => {
		const finalMessage = message || input.trim();
		if (finalMessage) {
			const userMessage: Message = {
				id: uuidv4(),
				message: finalMessage,
				sender: "user",
			};
			setMessages((prev) => [...prev, userMessage]);
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
					processPrompt(userMessage, useRAG);
				} catch (error) {
					return error;
				}
			} else {
				processPrompt(userMessage, useRAG);
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

	// Find the latest AI message
	const latestAIMessage = messages.filter(m => m.sender === "ai").slice(-1)[0];
	const isLastMessageAI = messages.length > 0 && messages[messages.length - 1].id === (latestAIMessage?.id ?? "");
	// Only set mock data if the modular UI is about to be shown (latest AI message exists)
	useEffect(() => {
		if (latestAIMessage) {
			if (!reasoning || reasoning.trim() === "") {
				setReasoning(MOCK_REASONING);
			}
			if (!sources || sources.length === 0) {
				setSources(MOCK_SOURCES);
			}
		}
		// Optionally, you can do the same for answer, answerTitle, etc. if you want mock defaults for those too
	}, [messages]);

	// Helper to fetch graph data if not present
	const fetchGraphData = async (message: string) => {
		try {
			console.log("🔍 Fetching graph data for message:", message);
			const res = await axios.post("/api/graphrag/explain", { input: message });
			console.log("📊 Graph API response:", res.data);
			console.log("📊 Full response object:", JSON.stringify(res.data, null, 2));
			console.log("📊 Response keys:", Object.keys(res.data));
			
			// The backend returns traversal as { nodes, relationships }
			if (res.data?.traversal) {
				console.log("🕸️  Traversal data:", res.data.traversal);
				
				// Map relationships to links for KGGraph
				const nodes = res.data.traversal.nodes.map((n: any) => ({
					...n.properties,
					id: n.elementId,
					label: n.labels[0],
					...n
				}));
				const links = res.data.traversal.relationships.map((r: any) => ({
					source: r.startNodeElementId,
					target: r.endNodeElementId,
					label: r.type
				}));
				
				console.log("🎯 Transformed nodes:", nodes);
				console.log("🔗 Transformed links:", links);
				
				const graphDataObj = { nodes, links };
				console.log("📈 Final graph data object:", graphDataObj);
				setGraphData(graphDataObj);
			} else if (res.data?.graph_traversal) {
				console.log("🕸️  Graph traversal data (alternative key):", res.data.graph_traversal);
				
				// Handle alternative key name
				const traversal = res.data.graph_traversal;
				const nodes = traversal.nodes.map((n: any) => {
					// Handle different node formats from backend
					const nodeData = {
						id: n.elementId || n.id,
						label: n.labels?.[0] || n.label || 'Unknown',
						...n.properties, // Spread properties first
						...n // Then spread the full node object to override with any additional fields
					};
					
					// Ensure we have meaningful display text
					if (!nodeData.name && !nodeData.text && !nodeData.description) {
						if (nodeData.label === 'Query') {
							nodeData.text = nodeData.properties?.text || 'User Query';
						} else if (nodeData.label === 'CybersecurityConcept') {
							nodeData.name = nodeData.properties?.name || 'Security Concept';
						} else if (nodeData.label === 'CybersecurityTopic') {
							nodeData.name = nodeData.properties?.name || 'Security Topic';
						} else if (nodeData.label === 'ExampleVulnerability') {
							nodeData.name = nodeData.properties?.name || 'Example Vulnerability';
						}
					}
					
					return nodeData;
				});
				
				const links = traversal.relationships.map((r: any) => ({
					source: r.startNodeElementId || r.source,
					target: r.endNodeElementId || r.target,
					label: r.type || r.label
				}));
				
				console.log("🎯 Transformed nodes:", nodes);
				console.log("🔗 Transformed links:", links);
				
				const graphDataObj = { nodes, links };
				console.log("📈 Final graph data object:", graphDataObj);
				setGraphData(graphDataObj);
			} else {
				console.warn("⚠️  No traversal data in response");
				console.warn("⚠️  Available keys:", Object.keys(res.data));
				
				// Create fallback graph data
				const fallbackGraphData = {
					nodes: [
						{
							id: 'query_node',
							label: 'Query',
							text: message.substring(0, 50) + '...',
							type: 'query'
						},
						{
							id: 'concept_sql_injection',
							label: 'CybersecurityConcept',
							name: 'sql injection',
							category: 'Attack',
							type: 'concept'
						}
					],
					links: [
						{
							source: 'query_node',
							target: 'concept_sql_injection',
							label: 'TRIGGERED_BY'
						}
					]
				};
				
				console.log("🔄 Using fallback graph data:", fallbackGraphData);
				setGraphData(fallbackGraphData);
			}
		} catch (e: any) {
			console.error("❌ Graph data fetch error:", e);
			
			// Handle specific database errors
			if (e.response?.status === 507) {
				// Database limit exceeded
				const errorMessage = `Database capacity limit reached. ${e.response.data?.details || 'Please upgrade your Neo4j tier or clean up existing data.'}`;
				showErrorToast(errorMessage);
			} else if (e.response?.status === 503) {
				// Database connection error
				showErrorToast("Database connection issue. Please try again later.");
			} else if (e.response?.data?.message) {
				showErrorToast(`Graph visualization error: ${e.response.data.message}`);
			} else {
				showErrorToast("Unable to load graph data. The database may be experiencing issues.");
			}
		}
	};

	// --- Legend data for the graph modal ---
	const legendTypes: string[] = graphData && graphData.nodes
		? Array.from(new Set(graphData.nodes.map((n: any) => String(n.label))))
		: [];
	const legendData = legendTypes.map(type => ({ type, color: KGColorMap[type] || '#95a5a6' }));

	// --- Visualise handler: open modal ---
	const handleVisualise = async () => {
		if (latestAIMessage?.message) {
			await fetchGraphData(latestAIMessage.message);
		}
		setShowVisualiseDialog(true);
	};

	// --- Close modal handler ---
	const handleCloseVisualise = () => {
		setShowVisualiseDialog(false);
	};

	// Handler for References button
	const handleReferences = () => {
		setRightPanel('references');
		setShowSourcesDrawer(false); // Don't use drawer, use side panel
	};

	// Handler to close right panel
	const handleClosePanel = () => {
		setRightPanel(null);
		setSidebarOpen(true); // Reopen sidebar when panel is closed
	};

	// Handler for More button
	const handleMoreClick = () => {
		setShowMoreOptions(!showMoreOptions);
	};

	// Handler for action card selection
	const handleActionCardClick = (card: any) => {
		setShowMoreOptions(false);
		handleSend(card.prompt, card.useRAG);
	};

	return (
		<div className="flex w-full h-full" style={{ minHeight: '100vh' }}>
			{/* Main Chat Area */}
			<motion.div
				animate={{ width: '100%' }}
				transition={{ duration: 0.4, type: 'spring' }}
				className="h-full flex flex-col"
				style={{ minWidth: 0 }}
			>
				<ScrollArea
					ref={scrollAreaRef}
					className="flex-1 p-4 w-full overflow-y-auto"
				>
					{messages.map((message, idx) => {
						const isPendingAction =
							pendingAction === message.id ||
							pendingAction === message.humanInTheLoopId;
						const isAISender = message.sender === "ai";
						const isLatestAI = latestAIMessage && message.id === latestAIMessage.id;

						if (isPendingAction && isAISender) {
							return actionType === "approval" ? (
								<motion.div
									key={message.id}
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
									key={message.id}
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
									key={message.id}
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

						// Only render the modular UI for the latest AI message, skip the default bubble
						if (isLatestAI) return null;

						const isUser = message.sender === "user";
						const messageClasses = `inline-block px-3 pt-3 rounded-xl max-w-[80%] sm:max-w-[100%] ${
							isUser
								? "bg-secondary dark:bg-primary-900 p-4 text-sm"
								: "text-foreground pr-4 overflow-y-auto text-pretty break-normal text-sm"
						}`;
						const containerClasses = `mb-4  ${isUser ? "text-right" : "text-left"}`;

						return (
							<motion.div
								key={message.id}
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

									<span className={`${messageClasses}`}>
										{isUser ? (
											message.message
										) : (
											<MarkdownViewer content={message.message} />
										)}
									</span>
								</div>
							</motion.div>
						);
					})}

					{/* After all messages, show modular UI if the last message is AI */}
					{isLastMessageAI && (
						<>
							{reasoning && (
								<ReasoningCollapsible reasoning={reasoning} loading={reasoningLoading} />
							)}
							<MiraModularResponse
								reasoning={reasoning}
								reasoningLoading={reasoningLoading}
								thinkingDuration={thinkingDuration}
								latestAIMessage={latestAIMessage}
								graphData={graphData}
								graphExplanation={graphExplanation}
								sources={sources}
								showSourcesDrawer={showSourcesDrawer}
								setShowSourcesDrawer={setShowSourcesDrawer}
								showVisualiseDialog={showVisualiseDialog}
								setShowVisualiseDialog={setShowVisualiseDialog}
								onVisualise={handleVisualise}
								onSources={handleReferences}
							/>
						</>
					)}

					{isLoading && (
						<motion.div
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -50 }}
							transition={{ duration: 0.3 }}
							className="flex items-center space-x-2 text-gray-500"
						>
							<Spinner />
							<span>Mira is thinking...</span>
						</motion.div>
					)}
					
					{/* Bottom spacing for sticky input */}
					<div className="h-20"></div>
				</ScrollArea>
				
				{/* Chat Input Area - Sticky at bottom */}
				<div className="border-t border-gray-200 p-4 bg-white dark:bg-gray-900 sticky bottom-0 z-10">
					{/* Role Buttons */}
					<div className="flex items-center space-x-2 mb-3">
						<button
							onClick={() => handleActionSend("Tutor")}
							className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium flex items-center space-x-2 shadow-md transition-all duration-200"
						>
							<span className="text-lg">🎓</span>
							<span>Tutor</span>
						</button>
						<button
							onClick={() => handleActionSend("Investigator")}
							className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 text-sm font-medium flex items-center space-x-2 shadow-md transition-all duration-200"
						>
							<span className="text-lg">🔍</span>
							<span>Investigator</span>
						</button>
						<button
							onClick={() => handleActionSend("Analyser")}
							className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium flex items-center space-x-2 shadow-md transition-all duration-200"
						>
							<span className="text-lg">📊</span>
							<span>Analyser</span>
						</button>
						<button
							onClick={handleMoreClick}
							className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 text-sm font-medium flex items-center space-x-2 shadow-md transition-all duration-200"
						>
							<span className="text-lg">⚙️</span>
							<span>More</span>
						</button>
					</div>

					{/* Action Cards for More Button */}
					{showMoreOptions && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
						>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{moreActionCards.map((card, index) => (
									<button
										key={index}
										onClick={() => handleActionCardClick(card)}
										className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all duration-200 text-left"
									>
										<div className="flex items-center space-x-2 mb-2">
											<span className="text-2xl">{card.icon}</span>
											<span className={`text-sm font-medium ${card.color}`}>
												{card.title}
											</span>
										</div>
										<p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
											{card.prompt}
										</p>
										{card.useRAG && (
											<span className="inline-block mt-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
												RAG
											</span>
										)}
									</button>
								))}
							</div>
						</motion.div>
					)}
					
					<div className="flex items-end space-x-2">
						<div className="flex-1">
							<textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
								placeholder="Type your message here..."
								className="w-full min-h-[60px] max-h-[120px] p-3 border border-input bg-background text-foreground rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
								rows={1}
							/>
						</div>
						<button
							onClick={() => handleSend()}
							disabled={!input.trim() || isLoading}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
						>
							<span>Send</span>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
							</svg>
						</button>
					</div>
				</div>

				{/* Visualise Dialog Modal */}
				<VisualiseDialog
					open={showVisualiseDialog}
					onOpenChange={handleCloseVisualise}
					graphData={graphData}
					legendData={legendData}
				>
					{graphData && <KGGraph data={graphData} />}
				</VisualiseDialog>
			</motion.div>
		</div>
	);
};

export default MiraChatBot;
