import { MessageCirclePlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import useChatActionStore from "../../store/chatActions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function NewChat() {
	const navigate = useNavigate();
	const { clearStore } = useChatActionStore();

	const handleNewChat = () => {
		clearStore();
		navigate("/chatbot");
	};

	return (
		<TooltipProvider>
			<SidebarMenu className="m-0">
				<SidebarMenuItem>
					<div className="w-full flex justify-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<SidebarMenuButton
									onClick={handleNewChat}
									className="w-full flex items-center justify-center gap-1 rounded-md bg-sidebar text-sidebar-foreground border border-sidebar-border hover:bg-accent transition-colors px-3 py-2 font-medium text-sm"
								>
									<MessageCirclePlusIcon className="h-4 w-4 text-muted-foreground" />
									<span>New chat</span>
								</SidebarMenuButton>
							</TooltipTrigger>
							<TooltipContent side="right" align="center">
								New Chat
							</TooltipContent>
						</Tooltip>
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		</TooltipProvider>
	);
}
