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
// import aevix from "../../../public/aevix.png";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader className="flex items-center mb-5">
				{/* <img src={aevix} alt="Logo" className="h-6 w-auto" /> */}
				<NewChat />
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent className="overflow-hidden h-screen">
				<ChatHistory />
			</SidebarContent>
			<SidebarSeparator />
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
