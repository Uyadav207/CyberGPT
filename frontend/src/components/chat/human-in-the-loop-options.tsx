import { Button } from "../ui/button";
import { BadgeInfo, XIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@components/ui/scroll-area";
import useChatActionStore from "../../store/chatActions";

interface VulnerabilityStandardsProps {
	question?: string;
	actionPrompts: { id: string; name: string; type: string }[];
	onConfirm: (selectedAction: string, type: string, actionId: string) => void;
	setShowInfo: (value: boolean) => void;
	addBotMessage: (message: string) => void;
}

const HumanInTheLoopOptions: React.FC<VulnerabilityStandardsProps> = ({
	question,
	actionPrompts,
	onConfirm,
	setShowInfo,
	addBotMessage,
}) => {
	const { setPendingAction } = useChatActionStore();
	return (
		<div className="relative flex flex-col mt-4 p-4 bg-[#eeedff] border-l-4 border-[#7156DB] mb-4 rounded-lg rounded-l-none">
			<div className="flex items-center justify-start">
				<XIcon
					onClick={() => {
						setPendingAction(null);
						addBotMessage("Action cancelled");
					}}
					className="h-5 w-5 cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-gray-700"
				/>

				<p className="text-gray-950 mr-2">{question}</p>

				<BadgeInfo
					onClick={() => setShowInfo(true)}
					className="h-4 w-4 cursor-pointer text-black"
				/>
			</div>

			<ScrollArea className="w-full md:w-[90%] mt-4">
				<div className="grid grid-cols-1 w-full justify-start  py-4">
					{actionPrompts.map((action) => (
						<Button
							key={action.id}
							variant="secondary"
							size="sm"
							onClick={() =>
								onConfirm(action.name, action.type, action.id)
							}
							className="bg-[#7156DB] text-white hover:bg-[#5c4baf] mb-2"
						>
							{action.name}
						</Button>
					))}
				</div>
				<ScrollBar orientation="horizontal" className="" />
			</ScrollArea>
		</div>
	);
};

export { HumanInTheLoopOptions };
