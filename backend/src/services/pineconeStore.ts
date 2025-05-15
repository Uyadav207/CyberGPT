import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "langchain/document";

export class PineconeService {
	private static instance: PineconeService;
	private store!: PineconeStore;

	private constructor() {
		this.initPinecone();
	}

	private async initPinecone() {
		const pinecone = new Pinecone({
			apiKey:
				process.env.PINECONE_API_KEY ||
				(() => {
					throw new Error("PINECONE_API_KEY is not defined");
				})(),
		});

		const embeddings = new OpenAIEmbeddings({
			openAIApiKey: process.env.OPENAI_API_KEY,
			modelName: "text-embedding-3-small",
		});

		const pineconeIndex = process.env.PINECONE_INDEX;
		if (!pineconeIndex) {
			throw new Error("PINECONE_INDEX is not defined");
		}
		const index = pinecone.Index(pineconeIndex);

		this.store = await PineconeStore.fromExistingIndex(embeddings, {
			pineconeIndex: index,
			namespace: "ns1",
		});
	}

	public static async getInstance(): Promise<PineconeService> {
		if (!PineconeService.instance) {
			PineconeService.instance = new PineconeService();
			await PineconeService.instance.initPinecone();
		}
		return PineconeService.instance;
	}

	async addDocuments(documents: Document[]): Promise<void> {
		await this.store.addDocuments(documents);
	}

	async similaritySearchBasedQuery(query: string, k = 5): Promise<Document[]> {
		return this.store.similaritySearch(query, k);
	}

	async similaritySearch(query: string, k = 5): Promise<Document[]> {
		const cveMatch = query.match(/CVE-\d{4}-\d+/i);

		if (cveMatch) {
			const cveId = cveMatch[0].toUpperCase();
			const filter = {
				metadata: {
					id: cveId,
				},
			};
			return this.store.similaritySearch(
				query.toUpperCase(),
				1,
				filter.metadata,
			);
		}
		const isListRequest =
			query.toLowerCase().includes("latest") ||
			query.toLowerCase().includes("list");
		if (isListRequest) {
			const results = await this.store.similaritySearch("", 100, {
				metadata: {},
			});

			const latestCves = results
				.filter((doc) => doc.metadata?.publishedDate)
				.sort(
					(a, b) =>
						new Date(b.metadata.publishedDate).getTime() -
						new Date(a.metadata.publishedDate).getTime(),
				)
				.slice(0, 10);

			return latestCves;
		}

		return this.store.similaritySearch(query, k);
	}

	async getLatestCVEs(): Promise<Document[]> {
		const results = await this.store.similaritySearch("", 100, {
			metadata: {},
		});

		const latestCves = results
			.filter((doc) => doc.metadata?.publishedDate)
			.sort(
				(a, b) =>
					new Date(b.metadata.publishedDate).getTime() -
					new Date(a.metadata.publishedDate).getTime(),
			)
			.slice(0, 10);

		return latestCves;
	}
}
