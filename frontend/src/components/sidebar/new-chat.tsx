import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import useChatActionStore from "../../store/chatActions";

export function NewChat() {
	const navigate = useNavigate();
	const { clearStore } = useChatActionStore();

	const handleNewChat = () => {
		clearStore();
		navigate("/chatbot");
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						tooltip="New Chat"
						className="flex bg-black text-white justify-center hover:bg-black hover:text-white dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black"
						onClick={handleNewChat}
					>
						<Plus />
						<span>New Chat</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</>
	);
}
