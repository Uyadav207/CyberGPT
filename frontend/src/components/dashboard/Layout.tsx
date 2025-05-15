import { AppSidebar } from "../sidebar/app-sidebar";
import { useLocation, Link } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { Separator } from "../../components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "../../components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { ModeToggle } from "../theme/mode-toggle";
import { HelpMenu } from "../chat/help-menu";

export function Layout() {
	const location = useLocation();

	// Get path segments for breadcrumbs
	const pathSegments = location.pathname.split("/").filter(Boolean);
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								{pathSegments.map((segment, index) => {
									const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
									const isLast =
										index === pathSegments.length - 1;

									return (
										<BreadcrumbItem key={path}>
											{isLast ? (
												<BreadcrumbPage>
													{segment}
												</BreadcrumbPage>
											) : (
												<Link
													to={path}
													className="breadcrumb-link"
												>
													{segment}
												</Link>
											)}
											{!isLast && <BreadcrumbSeparator />}
										</BreadcrumbItem>
									);
								})}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="top-0 mr-3">
						<ModeToggle />
					</div>
				</header>

				{/* Our Component for mira will render here */}

				<div className="flex flex-col min-h-[90vh] justify-between">
					<Outlet />
					<p className="text-center text-gray-500 text-wrap text-xs">
						Copyright &copy; Mira, a product of denkMinds, Planspiel
						Project {new Date().getFullYear()}
					</p>
				</div>

				{/* Add the help button here */}
				<HelpMenu />
			</SidebarInset>
		</SidebarProvider>
	);
}
