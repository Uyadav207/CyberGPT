import { NavUser } from "./nav-user";
import { NewChat } from "./new-chat";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	SidebarSeparator,
} from "../ui/sidebar";
import ChatHistory from "./nav-chat-history";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" {...props} variant="floating">
			<SidebarHeader>
				<NavUser />
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent className="overflow-hidden h-screen">
				<ChatHistory />
			</SidebarContent>
			<SidebarFooter>
				<NewChat />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
