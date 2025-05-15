import type { Context } from "hono";
import { ChatService } from "../services/chatService";

export class ChatController {
	private chatService!: ChatService;

	constructor() {
		this.init();
	}

	private async init() {
		this.chatService = await ChatService.getInstance();
	}

	async chatTitle(c: Context) {
		try {
			const { botMessage } = await c.req.json();
			const response = await this.chatService.generateTitle(botMessage);
			return c.json({ response });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json({ status: "error", message: errorMessage }, 500);
		}
	}

	async chatStream(c: Context) {
		try {
			const { message, useRAG, previousMessages = [] } = await c.req.json();
			const stream = await this.chatService.processMessageStream(
				message,
				useRAG,
				previousMessages,
			);

			return new Response(
				new ReadableStream({
					async start(controller) {
						try {
							let accumulatedToolCall = null;
							let accumulatedContent = "";

							for await (const chunk of stream) {
								const delta = chunk.choices[0]?.delta;

								// Handle regular content
								if (delta?.content) {
									accumulatedContent += delta.content;
									controller.enqueue(new TextEncoder().encode(delta.content));
								}

								// Handle tool calls
								if (delta?.tool_calls) {
									const toolCall = delta.tool_calls[0];

									if (!accumulatedToolCall) {
										accumulatedToolCall = {
											index: toolCall.index,
											id: toolCall.id,
											type: toolCall.type,
											function: {
												name: toolCall.function?.name || "",
												arguments: "",
											},
										};
									}

									if (toolCall.function?.arguments) {
										accumulatedToolCall.function.arguments +=
											toolCall.function.arguments;
									}

									console.log(toolCall);

									// Check if JSON is complete
									if (
										accumulatedToolCall.function.name &&
										accumulatedToolCall.function.arguments.trim()
									) {
										const jsonString =
											accumulatedToolCall.function.arguments.trim();

										// Log the JSON string for debugging
										// console.log("Accumulated JSON string:", jsonString);

										// Check if the JSON string is complete
										const lastChar = jsonString.slice(-1);
										console.log("Last char:", lastChar);

										if (
											lastChar === "}" ||
											lastChar === "]" ||
											lastChar === "]}"
										) {
											try {
												// Attempt to parse the JSON string
												const parsedArgs = JSON.parse(jsonString);

												// Send tool call response
												const toolCallResponse = {
													type: "tool_call",
													data: {
														name: accumulatedToolCall.function.name,
														arguments: parsedArgs,
													},
												};
												controller.enqueue(
													new TextEncoder().encode(
														JSON.stringify(toolCallResponse),
													),
												);

												// Reset accumulator
												accumulatedToolCall = null;
											} catch (e) {
												console.debug("Error parsing JSON:", e);
											}
										}
									}
								}
							}

							controller.close();
						} catch (error) {
							console.error("Streaming error:", error);
							controller.error(error);
						}
					},
				}),
				{
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				},
			);
		} catch (error) {
			console.error("Controller error:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json({ status: "error", message: errorMessage }, 500);
		}
	}
	async chatSummary(c: Context) {
		try {
			const { messages } = await c.req.json();
			const stream = await this.chatService.processChatSummary(messages);
			return new Response(
				new ReadableStream({
					async start(controller) {
						for await (const chunk of stream) {
							const content = chunk.choices[0]?.delta?.content;
							if (content) {
								controller.enqueue(new TextEncoder().encode(content));
							}
						}
						controller.close();
					},
				}),
				{
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				},
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json({ status: "error", message: errorMessage }, 500);
		}
	}
}
