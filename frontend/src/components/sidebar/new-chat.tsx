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
		<SidebarMenu className="mt-8 mb-2">
			<SidebarMenuItem>
				<div className="w-full flex justify-center">
					<SidebarMenuButton
						tooltip="New Chat"
						onClick={handleNewChat}
						className="w-fit flex items-center justify-center gap-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-[#d9e7ff] py-2.5 px-4 font-medium transition-colors"
					>
						<Plus className="h-4 w-4 stroke-blue-700" />
						<span className="text-sm font-medium">New chat</span>
					</SidebarMenuButton>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
