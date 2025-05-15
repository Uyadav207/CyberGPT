export interface Chats {
	_id: string;
	title: string;
	createdAt: string;
}

export interface Info {
	id: string;
	name: string;
	type: string;
	description: string;
}

export interface ChatHistory {
	_id: string;
	humanInTheLoopId: string;
	chatId: string;
	message: string;
	sender: string;
	createdAt: string;
}

export interface Message {
	id?: string;
	humanInTheLoopId?: string;
	chatId?: string;
	hitId?: string;
	message: string;
	actionPrompts?: { id: string; name: string; type: sting }[];
	sender: "user" | "ai";
	humanInTheLoopMessage?: string;
	actionType?: string;
	confirmType?: string;
	isStreaming?: boolean;
}

export interface RequestHumanInLoop {
	action: string; // action for the approval message
	prompt?: string; // prompt to show to the human
	type?: string; // type of action to perform [none for options] [action type for approval]
	id?: string; // id to link the approval message to the action
}
