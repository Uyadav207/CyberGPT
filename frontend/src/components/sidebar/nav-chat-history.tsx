import { useState, useEffect } from "react";

import {
	ArrowRight,
	ChevronRight,
	MessageCircleDashedIcon,
	MessageSquareCode,
	TrendingUpDown,
	Search,
} from "lucide-react";
import {
	Folder,
	Box,
	ChartNetwork,
	BotMessageSquare,
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
						<BotMessageSquare className="h-6 w-6" />
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

interface NavChatHistoryProps {
  onOpenSearch: () => void;
}

export default function ChatHistory({ onOpenSearch }: NavChatHistoryProps) {
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
			{/* Search button and shortcut icons above Recent Chats */}
			<button
				onClick={onOpenSearch}
				className="flex items-center justify-between w-full bg-sidebar text-sidebar-foreground hover:bg-accent/60 rounded-none px-4 py-2 border-b border-sidebar-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
				title="Search"
				style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
			>
				<span className="flex items-center gap-2 text-sm font-medium">
					<Search className="h-5 w-5 mr-1 text-muted-foreground" />
					<span>Search</span>
				</span>
				<span className="flex items-center gap-1">
					<span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-semibold text-muted-foreground border border-sidebar-border">⌘</span>
					<span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-semibold text-muted-foreground border border-sidebar-border">S</span>
				</span>
			</button>
			<div className="flex-1 flex flex-col overflow-y-auto scrollbar-grey">
				<SidebarGroup>
					{recentChats?.length > 0 && (
						<SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
					)}
					<SidebarContent className="flex-1 flex flex-col">
						<SidebarGroupContent>
							<SidebarMenu>
								{isLoading ? (
									<ChatSkeleton />
								) : !sortedChat || sortedChat.length === 0 ? (
									<SidebarMenuItem>
										<div className="mt-10 gap-y-5 flex flex-col items-center justify-center">
											<MessageCircleDashedIcon />
											{state === "expanded" && <p>Empty Chat History</p>}
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
			<SidebarGroup className="sidebar-section mt-auto">
				<SidebarMenu>
					<Collapsible defaultOpen={false} className="group/collapsible">
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton tooltip="My Space">
									<Box className="h-6 w-6" />

									<span>My Space</span>
									<ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<SidebarMenuSub>
									<Collapsible
										defaultOpen={false}
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton tooltip="View Analytics">
													<ChartNetwork className="h-4 w-4" />
													<span> Analytics</span>
													<ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
												</SidebarMenuButton>
											</CollapsibleTrigger>

											<CollapsibleContent>
												<SidebarMenuSub className="pl-4">
													{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
													<a onClick={() => navigate("/recent-scan")}>
														<SidebarMenuButton tooltip="Dynamic Scans">
															<TrendingUpDown className="h-4 w-4" />
															<span>Dynamic Scans</span>
														</SidebarMenuButton>
													</a>
													{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
													<a onClick={() => navigate("/recent-static-scans")}>
														<SidebarMenuButton tooltip="Static Scans">
															<ArrowRight className="h-4 w-4" />
															<span>Static Scans</span>
														</SidebarMenuButton>
													</a>
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>

									{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
									<a onClick={() => navigate("/reports")}>
										<SidebarMenuButton tooltip="Reports">
											<Folder className="h-4 w-4" />
											<span>Reports</span>
										</SidebarMenuButton>
										<SidebarMenuBadge>{reportCount}</SidebarMenuBadge>
									</a>
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
				</SidebarMenu>
			</SidebarGroup>
		</>
	);
}
