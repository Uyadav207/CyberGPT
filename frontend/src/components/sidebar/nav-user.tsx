import { ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "../../components/ui/avatar";
import { LucideSettings2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	useSidebar,
} from "../../components/ui/sidebar";

import type { User } from "../../types/user";
import useStore from "../../store/store";
import { Dialog } from "../dialog";
import { useState } from "react";
import { Logout } from "./logout";

export function NavUser() {
	const { isMobile } = useSidebar();
	const userData = useStore();
	const logout = useStore((state) => state.logout);
	const user: User = userData.user as User;
	const [isDialogOpen, setDialogOpen] = useState(false);
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		window.location.href = "/login";
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<Avatar className="rounded-lg object-cover">
									<AvatarImage
										src={user?.avatar ?? undefined}
										alt={user?.firstName}
									/>
									<AvatarFallback className="rounded-lg bg-blue-100">
										{user?.firstName.substring(0, 1)}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user?.firstName}
									</span>
									<span className="truncate text-xs">@{user?.username}</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src={user?.avatar ?? undefined}
											alt={user?.firstName ?? undefined}
										/>
										<AvatarFallback className="rounded-lg">
											{/* {fullName.substring(0, 1)} */}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{user?.firstName}
										</span>
										<span className="truncate text-xs">{user?.email}</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<SidebarSeparator />
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Logout />
								</div>
								<div>
									{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
									<a onClick={() => navigate("/accounts")}>
										<SidebarMenuButton tooltip="Preferences">
											<LucideSettings2 className="h-4 w-4" />
											<span>Preferences</span>
										</SidebarMenuButton>
									</a>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<Dialog
				open={isDialogOpen}
				onClose={() => setDialogOpen(false)}
				title="Log out"
				description="Are you sure you want to log out? You will need to sign in again to access your account."
				onConfirm={handleLogout}
				onCancel={() => setDialogOpen(false)}
				confirmText="Log out"
				cancelText="Cancel"
			/>
		</>
	);
}
