"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../../ui/tooltip";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";

import {
	Glasses as GlassesIcon,
	Search,
	Globe,
	ArrowUp,
	MoreHorizontal,
	Monitor as DockIcon,
	Github,
} from "lucide-react";

import tooltipData from "../data/tooltipData.json";
import { actionCards } from "../../actions.ts";

const iconMap = {
	GlassesIcon: <GlassesIcon size={16} className="mr-1 text-[#5E5E5D]" />,
	Search: <Search size={16} className="mr-1 text-[#5E5E5D]" />,
	Globe: <Globe size={16} className="mr-1 text-[#5E5E5D]" />,
	MoreHorizontal: <MoreHorizontal size={16} className="text-[#5E5E5D]" />,
	ArrowUp: <ArrowUp size={18} className="text-[#5E5E5D]" />,
};

interface RoleButtonGroupProps {
	handleActionClick: (action: string, useRAG?: boolean) => void;
}

export default function RoleButtonGroup({
	handleActionClick,
}: RoleButtonGroupProps): JSX.Element {
	const leftButtons = tooltipData.filter(
		(item): item is TooltipDataItem => !item.iconOnly,
	);
	const rightButtons = tooltipData.filter(
		(item): item is TooltipDataItem => item.iconOnly === true,
	);

	interface TooltipDataItem {
		label: string;
		icon: keyof typeof iconMap;
		tooltip: string;
		iconOnly?: boolean;
	}

	return (
		<TooltipProvider>
			<div className="flex justify-between items-center mt-3 flex-wrap">
				{/* Left Group */}
				<div className="flex space-x-2">
					{leftButtons.map(({ label, icon, tooltip }) => (
						<Tooltip key={label}>
							<TooltipTrigger asChild>
								{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
								<button className="flex items-center space-x-1 px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-200">
									{iconMap[icon as keyof typeof iconMap]}
									<span className="text-[#5E5E5D] text-sm">{label}</span>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{tooltip}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</div>

				{/* Right Group */}
				<div className="flex items-center space-x-2 mt-2 sm:mt-0">
					{rightButtons.map(({ label, icon, tooltip }) => {
						// Special handling for MoreHorizontal icon - add dropdown
						if (icon === "MoreHorizontal") {
							return (
								<DropdownMenu key={label}>
									<DropdownMenuTrigger asChild>
										{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
										<button className="border p-2 rounded-full border-gray-300 hover:bg-gray-100">
											{iconMap[icon]}
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										{actionCards.map((action, index) => (
											<DropdownMenuItem
												// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
												key={index}
												onClick={() => handleActionClick(action.title, true)}
												className="flex items-center py-2 cursor-pointer"
											>
												<action.icon
													className={`mr-2 h-4 w-4 ${action.color}`}
												/>
												<span>{action.title}</span>
												{action.useRAG && (
													<span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded-full">
														RAG
													</span>
												)}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							);
						}

						// Regular button for other icons
						return (
							<Tooltip key={label}>
								<TooltipTrigger asChild>
									{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
									<button
										className={`text-gray-500 hover:text-gray-700 ${
											icon === "ArrowUp"
												? "bg-gray-200 p-2 rounded-full"
												: "border p-2 rounded-full border-gray-300"
										}`}
									>
										{iconMap[icon]}
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{tooltip}</p>
								</TooltipContent>
							</Tooltip>
						);
					})}
				</div>
			</div>
		</TooltipProvider>
	);
}
