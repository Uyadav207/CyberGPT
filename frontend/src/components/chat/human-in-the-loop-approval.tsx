import { XIcon } from "lucide-react";
import { Button } from "../ui/button";
import useChatActionStore from "../../store/chatActions";

interface HumanInTheLoopProps {
	onConfirm: (confirmType: string) => void;
	onCancel: () => void;
	message?: string;
	confirmType: string;
	addBotMessage: (message: string) => void;
}

const HumanInTheLoopApproval: React.FC<HumanInTheLoopProps> = ({
	onConfirm,
	onCancel,
	message,
	confirmType,
	addBotMessage,
}) => {
	const { setPendingAction } = useChatActionStore();
	return (
		<div className="relative flex flex-col mt-4 p-4 bg-[#eeedff] border-l-4 border-[#7156DB] mb-4 rounded-lg rounded-l-none">
			<XIcon
				onClick={() => {
					setPendingAction(null);
					addBotMessage("Action cancelled?");
				}}
				className="h-5 w-5 cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-gray-700"
			/>
			<p className="text-gray-950 mr-2 mb-4">{message}</p>
			<div className="flex space-x-4">
				<Button
					size="lg"
					className="bg-[#7156DB] text-white hover:bg-[#5c4baf]"
					onClick={() => {
						onConfirm(confirmType);
					}}
				>
					Yes
				</Button>
				<Button
					size="lg"
					className="bg-red-500 text-white hover:bg-red-700"
					type="button"
					onClick={onCancel}
				>
					No
				</Button>
			</div>
		</div>
	);
};

export { HumanInTheLoopApproval };
