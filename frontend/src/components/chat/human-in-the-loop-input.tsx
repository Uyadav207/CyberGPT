import { Button } from "../ui/button";
import { BadgeInfo, XIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";
import type { RequestHumanInLoop } from "../../types/chats";
import useChatActionStore from "../../store/chatActions";

interface HumanInTheLoopInputProps {
	message: string;
	onConfirm: (
		selectedAction: string,
		requestHumanInLoop: RequestHumanInLoop | null,
	) => Promise<void>;
	setShowInfo: (value: boolean) => void;
	requestHumanInLoop: RequestHumanInLoop | null;
	addBotMessage: (message: string) => void;
}

const HumanInTheLoopInput: React.FC<HumanInTheLoopInputProps> = ({
	message,
	onConfirm,
	setShowInfo,
	requestHumanInLoop,
	addBotMessage,
}) => {
	const [inputValue, setInputValue] = useState("");
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
				<p className="text-gray-950 mr-2">{message}</p>

				<BadgeInfo
					onClick={() => setShowInfo(true)}
					className="h-4 w-4 cursor-pointer text-black"
				/>
			</div>

			<div className="flex space-x-4 mt-2">
				<Input
					placeholder="Enter your response"
					className="w-full text-primary bg-secondary"
					type="text"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
				/>
				<Button
					onClick={() => onConfirm(inputValue, requestHumanInLoop)}
					variant="secondary"
					size="sm"
					className="bg-[#7156DB] text-white hover:bg-[#5c4baf]"
				>
					Submit
				</Button>
			</div>
		</div>
	);
};

export { HumanInTheLoopInput };
