import { useState, useEffect } from "react";

import {
	ArrowRight,
	BadgeEuroIcon,
	BinocularsIcon,
	ChevronRight,
	Lightbulb,
	LucideSettings2,
	MessageSquareCode,
	TrendingUpDown,
} from "lucide-react";
import {
	Folder,
	Home,
	MessageCircle,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarSeparator,
	SidebarContent,
	SidebarGroupContent,
} from "@components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { SidebarMenuBadge } from "@components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Chats } from "../../types/chats";
import { SidebarMenuSub, useSidebar } from "../ui/sidebar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import { showSuccessToast } from "../toaster";
import "./customScrollbar.css";
import Tutorial from "../tutorial/Tutorial";

const ChatSkeleton = () => {
	return (
		<div className="animate-pulse">
			{[...Array(5)].map((_, i) => {
				const key = `skeleton-${i}`;
				return (
					<div key={key} className="flex items-center space-x-4 p-2">
						<div className="h-5 w-5 rounded-full bg-secondary " />
						<div className="h-5 w-3/4 rounded bg-secondary" />
					</div>
				);
			})}
		</div>
	);
};
const isToday = (date: Date) => {
	const today = new Date();
	return date.toDateString() === today.toDateString();
};
const isWithinLast7Days = (date: Date) => {
	const today = new Date();
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(today.getDate() - 7);
	return date >= sevenDaysAgo && !isToday(date);
};
const isWithinLast30Days = (date: Date) => {
	const today = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(today.getDate() - 30);
	return date >= thirtyDaysAgo && !isWithinLast7Days(date) && !isToday(date);
};
const renderCategory = (
	label: string,
	chats: Chats[],
	navigate: (path: string) => void,
	handleDelete: (chatId: string) => Promise<void>,
) => (
	<>
		<SidebarGroupLabel>{label}</SidebarGroupLabel>
		{chats.map((chat) => (
			<SidebarMenuItem key={chat._id}>
				<SidebarMenuButton
					asChild
					className="w-full justify-between cursor-pointer"
					onClick={() => navigate(`/chatbot/${chat._id}`)}
				>
					<div className="flex items-center">
						<MessageCircle className="h-4 w-4" />
						<span className="flex-grow truncate">{chat.title}</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<MoreHorizontal className="h-4 w-4 ml-auto right-0 cursor-pointer" />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								sideOffset={4}
								className="w-[160px] bg-white shadow-lg rounded-md border border-gray-200"
							>
								<DropdownMenuItem
									onClick={(e: Event) => {
										e.stopPropagation();
										handleDelete(chat._id);
									}}
									className="text-red-600 flex items-center gap-2 hover:bg-red-50 cursor-pointer"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									<span>Delete</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		))}
	</>
);

export default function ChatHistory() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);
	const { state } = useSidebar();
	const user = useStore((state) => state.user);
	if (!user) {
		return null;
	}
	const { id } = user;

	const recentChats = useQuery(api.chats.getChatsByUserId, {
		userId: String(id),
	});

	const deleteChatById = useMutation(api.chats.deleteChatById);

	const handleDelete = async (chatId: string) => {
		try {
			const result = await deleteChatById({ chatId });

			showSuccessToast(result.message);
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`An error occurred: ${error.message}`);
			}
		}
	};

	const folderData = useQuery(api.reports.getReportFoldersByUser, {
		userId: String(id),
	});
	const reportCount = folderData?.length ?? 0;

	useEffect(() => {
		if (recentChats) {
			setIsLoading(false);
		}
	}, [recentChats]);

	// Ensure recentChats is of type Chats[]
	const sortedChat: Chats[] = recentChats
		?.slice()
		.sort((a: Chats, b: Chats) => {
			const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
			const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
			return dateB - dateA; // Sort by descending
		});

	// Categorize chats
	const todayChats = sortedChat?.filter((chat) =>
		isToday(new Date(chat.createdAt)),
	);
	const last7DaysChats = sortedChat?.filter((chat) =>
		isWithinLast7Days(new Date(chat.createdAt)),
	);
	const last30DaysChats = sortedChat?.filter((chat) =>
		isWithinLast30Days(new Date(chat.createdAt)),
	);
	const olderChats = sortedChat?.filter(
		(chat) =>
			!isToday(new Date(chat.createdAt)) &&
			!isWithinLast7Days(new Date(chat.createdAt)) &&
			!isWithinLast30Days(new Date(chat.createdAt)),
	);

	const [runTutorial, setRunTutorial] = useState(false);

	// Handle the "Take a Tutorial" button click
	const handleTakeTutorial = () => {
		setRunTutorial(true);
	};

	// Handle tutorial exit (mark the tutorial as seen)
	const handleExitTutorial = () => {
		localStorage.setItem("hasSeenTutorial", "true"); // Store in localStorage that the user has seen the tutorial
		setRunTutorial(false); // Hide the tutorial after exit
	};

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const sub = (user as any)?.subscription;

	const [type] = useState<string>(() => {
		switch (sub) {
			case "FREE":
				return "free";
			case "PRO":
				return "pro";
			case "INTERMEDIATE":
				return "intermediate";
			default:
				return "unknown";
		}
	});

	let colorClasses = "";
	let label = "";

	if (type === "free") {
		colorClasses = "bg-green-200 text-green-500 border-green-200";
		label = "Free";
	} else if (type === "pro") {
		colorClasses = "bg-purple-200 text-purple-500 border-purple-200";
		label = "Pro";
	} else if (type === "intermediate") {
		colorClasses = "bg-orange-200 text-orange-500 border-orange-200";
		label = "Standard";
	} else {
		colorClasses = "bg-gray-200 text-gray-500 border-gray-200";
		label = "Unknown";
	}

	return (
		<>
			<SidebarGroup className="sidebar-section">
				<SidebarGroupLabel>Application</SidebarGroupLabel>
				<SidebarMenu>
					<Collapsible
						defaultOpen={false}
						className="group/collapsible"
					>
						<SidebarMenuItem className="dashboard-section">
							<CollapsibleTrigger asChild>
								<SidebarMenuButton tooltip="Dashboard">
									<Home className="h-4 w-4" />
									<span>Dashboard</span>
									<ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
									{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
									<a onClick={() => navigate("/recent-scan")}>
										<SidebarMenuButton tooltip="Scans">
											<TrendingUpDown className="h-4 w-4" />
											<span>Dynamic Scans</span>
										</SidebarMenuButton>
									</a>

									<a
										// biome-ignore lint/a11y/useValidAnchor: <explanation>
										onClick={() =>
											navigate("/recent-static-scans")
										}
									>
										<SidebarMenuButton tooltip="Scans">
											<ArrowRight className="h-4 w-4" />
											<span>Static Scans</span>
										</SidebarMenuButton>
									</a>
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
					<SidebarMenuItem className="reports-section">
						{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
						<a onClick={() => navigate("/reports")}>
							<SidebarMenuButton tooltip="Reports">
								<Folder className="h-4 w-4" />
								<span>Reports</span>
							</SidebarMenuButton>

							{/* Calculate Length of the no of reports array */}
							<SidebarMenuBadge>{reportCount}</SidebarMenuBadge>
						</a>
					</SidebarMenuItem>
					<SidebarMenuItem>
						{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
						<a onClick={() => navigate("/accounts")}>
							<SidebarMenuButton tooltip="Preferences">
								<LucideSettings2 className="h-4 w-4" />
								<span>Preferences</span>
							</SidebarMenuButton>
						</a>
					</SidebarMenuItem>
					<SidebarMenuItem>
						{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
						<a onClick={() => navigate("/subscription")}>
							<SidebarMenuButton tooltip="Preferences">
								<BadgeEuroIcon className="h-4 w-4" />
								<span>Subscription</span>
								<SidebarMenuBadge>
									<span
										className={`text-xs px-2 py-0.5 rounded border ${colorClasses}`}
									>
										{label}
									</span>
								</SidebarMenuBadge>
							</SidebarMenuButton>
						</a>
					</SidebarMenuItem>
					<SidebarMenuItem>
						{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
						<a onClick={() => navigate("/faqs")}>
							<SidebarMenuButton tooltip="FAQs">
								<Lightbulb className="h-5 w-5" />
								<span>FAQs</span>
							</SidebarMenuButton>
						</a>
					</SidebarMenuItem>
					<SidebarMenuButton
						tooltip="Tutorial"
						onClick={handleTakeTutorial}
					>
						<BinocularsIcon />
						<span>Tutorial</span>
					</SidebarMenuButton>
					<Tutorial run={runTutorial} onExit={handleExitTutorial} />
				</SidebarMenu>
			</SidebarGroup>
			<SidebarSeparator />
			<div className="chat-history-section max-h-[70vh] overflow-y-scroll scrollbar-grey">
				<SidebarGroup>
					{recentChats?.length > 0 && (
						<SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
					)}
					<SidebarContent className="h-[calc(100vh-280px)]">
						<SidebarGroupContent>
							<SidebarMenu>
								{isLoading ? (
									<ChatSkeleton />
								) : !sortedChat || sortedChat.length === 0 ? (
									<SidebarMenuItem>
										<div className="mt-10 flex flex-col items-center justify-center">
											<MessageSquareCode />
											{state === "expanded" && (
												<p>No recent chats</p>
											)}
										</div>
									</SidebarMenuItem>
								) : (
									<>
										{todayChats?.length > 0 &&
											renderCategory(
												"Today",
												todayChats,
												navigate,
												handleDelete,
											)}
										{last7DaysChats?.length > 0 &&
											renderCategory(
												"Previous 7 Days",
												last7DaysChats,
												navigate,
												handleDelete,
											)}
										{last30DaysChats?.length > 0 &&
											renderCategory(
												"Previous 30 Days",
												last30DaysChats,
												navigate,
												handleDelete,
											)}
										{olderChats?.length > 0 &&
											renderCategory(
												"Older",
												olderChats,
												navigate,
												handleDelete,
											)}
									</>
								)}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarContent>
				</SidebarGroup>
			</div>
		</>
	);
}
