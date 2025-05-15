import type { Context } from "hono";
import { PineconeService } from "../services/pineconeStore";
import { OpenAIService } from "../services/openai";
import { Document } from "langchain/document";
import type { CVEDocument } from "../types/cve";

interface QueryResponse {
	answer: string;
	context: Document[];
	metadata?: {
		totalDocs: number;
		searchScore?: number;
	};
}

export class RAGController {
	private pinecone!: PineconeService;
	private openai = OpenAIService.getInstance();

	constructor() {
		this.init();
	}

	private async init() {
		this.pinecone = await PineconeService.getInstance();
	}

	async loadDocuments(c: Context) {
		try {
			const body = await c.req.json();
			const documents = body.documents.map(
				(doc: CVEDocument) =>
					new Document({
						pageContent: JSON.stringify(doc),
						metadata: { id: doc?.CVE_data_meta?.ID },
					}),
			);

			await this.pinecone.addDocuments(documents);
			return c.json({ status: "success", count: documents.length });
		} catch (error) {
			return c.json(
				{ status: "error", message: (error as Error).message },
				500,
			);
		}
	}

	async getDocuments(c: Context) {
		try {
			const response = await this.pinecone.getLatestCVEs();
			const cveid = response.map((cve) => cve.metadata.id);

			return c.json({ status: "success", cve: cveid.slice(0, 5) });
		} catch (error) {
			return c.json(
				{ status: "error", message: (error as Error).message },
				500,
			);
		}
	}

	async query(c: Context) {
		try {
			const { question } = await c.req.json();

			// Input validation
			if (!question || typeof question !== "string") {
				return c.json(
					{
						status: "error",
						message: "Invalid question format",
					},
					400,
				);
			}

			const docs: Document[] =
				await this.pinecone.similaritySearchBasedQuery(question);

			// Handle no results case
			if (docs.length === 0) {
				return c.json({
					answer: "No information found for the given query.",
					context: [],
					metadata: { totalDocs: 0 },
				});
			}

			const answer = await this.openai.generateRagQueryAnswer(docs);

			const response: QueryResponse = {
				answer,
				context: docs,
				metadata: {
					totalDocs: docs.length,
				},
			};

			return c.json(response);
		} catch (error) {
			return c.json(
				{ status: "error", message: (error as Error).message },
				500,
			);
		}
	}
}
