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
import React from "react"; // Added missing import for React
import { motion } from "framer-motion";

const iconMap = {
	GlassesIcon: <GlassesIcon size={16} className="mr-1 text-[#5E5E5D]" />,
	Search: <Search size={16} className="mr-1 text-[#5E5E5D]" />,
	Globe: <Globe size={16} className="mr-1 text-[#5E5E5D]" />,
	MoreHorizontal: <MoreHorizontal size={16} className="text-[#5E5E5D]" />,
	ArrowUp: <ArrowUp size={18} className="text-[#5E5E5D]" />,
};

interface RoleButtonGroupProps {
	handleActionClick: (action: string, useRAG?: boolean) => void;
	selectedAgentMode: 'tutor' | 'investigator' | 'analyst' | undefined;
	onAgentModeChange: (mode: 'tutor' | 'investigator' | 'analyst' | undefined) => void;
	agentButtonsDisabled: boolean;
	handleSend: () => void;
}

export default function RoleButtonGroup({
	handleActionClick,
	selectedAgentMode,
	onAgentModeChange,
	agentButtonsDisabled,
	handleSend,
}: RoleButtonGroupProps): JSX.Element {
	interface TooltipDataItem {
		label: string;
		icon: keyof typeof iconMap;
		tooltip: string;
		iconOnly?: boolean;
	}

	const leftButtons: TooltipDataItem[] = tooltipData.slice(0, 3) as TooltipDataItem[];
	const rightButtons: TooltipDataItem[] = tooltipData.slice(3) as TooltipDataItem[];

	return (
		<TooltipProvider>
			<div className="flex justify-between items-center mt-3 flex-wrap">
				{/* Left Group - Agent Personality Buttons */}
				<div className="flex space-x-2">
					{leftButtons.map(({ label, icon, tooltip }) => {
						const agentMode = label.toLowerCase() as 'tutor' | 'investigator' | 'analyst';
						const isSelected = selectedAgentMode === agentMode;
						// Update iconElement logic to use text-white dark:text-black for selected, text-muted-foreground otherwise
						const iconElement = React.cloneElement(iconMap[icon], {
							className: isSelected ? 'mr-1 text-white dark:text-black' : 'mr-1 text-muted-foreground'
						});
						return (
							<Tooltip key={label}>
								<TooltipTrigger asChild>
									<button
										onClick={() => !agentButtonsDisabled && onAgentModeChange(isSelected ? undefined : agentMode)}
										disabled={agentButtonsDisabled}
										className={`flex items-center space-x-1 px-3 py-1 rounded-full border transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-black/30 focus:z-10
  ${isSelected
    ? 'border-sidebar-border bg-black text-white dark:bg-white dark:text-black font-bold'
    : 'border-sidebar-border text-muted-foreground hover:bg-accent/60'}
  ${agentButtonsDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
`}
									>
										{iconElement}
										<span className="text-sm">{label}</span>
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{tooltip} {isSelected ? '(Active)' : ''}</p>
								</TooltipContent>
							</Tooltip>
						);
					})}
				</div>

				{/* Right Group */}
				<div className="flex items-center space-x-2 mt-2 sm:mt-0">
					{rightButtons.map(({ label, icon, tooltip }) => {
						// Special handling for MoreHorizontal icon - add dropdown
						if (icon === "MoreHorizontal") {
							return (
								<DropdownMenu key={label}>
									<Tooltip>
										<TooltipTrigger asChild>
											<DropdownMenuTrigger asChild>
												{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
												<button className="w-10 h-10 p-2 rounded-full border border-sidebar-border text-muted-foreground bg-transparent flex items-center justify-center">
													{iconMap[icon]}
												</button>
											</DropdownMenuTrigger>
										</TooltipTrigger>
										<TooltipContent side="top" align="center">
											Choose actions
										</TooltipContent>
									</Tooltip>
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
										onClick={icon === "ArrowUp" ? () => {
											console.log('Send button clicked!');
											handleSend();
										} : undefined}
										disabled={icon === "ArrowUp" ? false : agentButtonsDisabled}
                                        className={
                                            icon === "ArrowUp"
                                                ? "w-10 h-10 p-2 rounded-full flex items-center justify-center transition-all duration-200 bg-black text-white dark:bg-white dark:text-black"
                                                : "border p-2 rounded-full border-sidebar-border text-muted-foreground hover:text-sidebar-foreground"
                                        }
									>
                                        {icon === "ArrowUp"
                                            ? (
                                                <motion.span
                                                    whileHover={{ scale: 1.25 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="w-6 h-6 flex items-center justify-center"
                                                >
                                                    {React.cloneElement(iconMap[icon], {
                                                        className: "text-white dark:text-black w-5 h-5"
                                                    })}
                                                </motion.span>
                                            )
                                            : (
                                                <>
                                                    {iconMap[icon]}
                                                    <span className="text-sm">{label}</span>
                                                </>
                                            )
                                        }
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
