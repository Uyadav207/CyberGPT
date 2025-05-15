import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	chats: defineTable({
		userId: v.string(), // External userId as a string
		title: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_userId", ["userId"]),

	chatHistory: defineTable({
		chatId: v.id("chats"),
		humanInTheLoopId: v.string(),
		sender: v.union(v.literal("user"), v.literal("ai")),
		message: v.string(),
		createdAt: v.number(),
	}).index("by_chatId", ["chatId"]),

	summaries: defineTable({
		userId: v.string(), // External userId as a string
		title: v.string(),
		content: v.string(),
		createdAt: v.number(),
	}).index("by_userId", ["userId"]),

	reportFolders: defineTable({
		userId: v.string(),
		folderName: v.string(),
		createdAt: v.number(),
	}).index("by_userId", ["userId"]),

	reports: defineTable({
		folderId: v.id("reportFolders"),
		fileName: v.string(),
		fileUrl: v.string(),
		markdownContent: v.string(),
		reportType: v.optional(
			v.union(v.literal("chatSummaryReport"), v.literal("vulnerabilityReport")),
		),
		createdAt: v.number(),
	}).index("by_folderId", ["folderId"]),

	scans: defineTable({
		userId: v.string(), // Reference to the user
		targetUrl: v.string(),
		complianceStandard: v.string(),
		scanType: v.string(),
		totalRisks: v.object({
			totalVulnerabilities: v.number(),
			Medium: v.number(),
			High: v.number(),
			Low: v.number(),
			Critical: v.number(),
			Informational: v.number(),
		}),
	}).index("by_userId", ["userId"]),

	vulnerabilities: defineTable({
		scanId: v.id("scans"), // Reference to the scan
		alert: v.string(),
		AffectedUrisCount: v.string(),
		riskDesc: v.string(),
	}).index("by_scanId", ["scanId"]),

	vulnerabilityInfo: defineTable({
		vulnerabilityId: v.id("vulnerabilities"),
		riskLevel: v.string(),
		cweId: v.string(),
		cveIds: v.array(v.string()),
		description: v.string(),
		affectedUrls: v.array(
			v.object({
				uri: v.string(),
				method: v.string(),
				attack: v.string(),
				evidence: v.string(),
			}),
		),
		solution: v.string(),
		confidence: v.string(),
		reference: v.string(),
	}).index("by_vulnerabilityId", ["vulnerabilityId"]),

	staticScans: defineTable({
		userId: v.string(),
		repoType: v.string(),
		projectKey: v.string(),
		metrics: v.optional(
			v.object({
				coverage: v.string(),
				bugs: v.string(),
				reliability_rating: v.string(),
				code_smells: v.string(),
				duplicated_lines_density: v.string(),
				security_rating: v.string(),
				ncloc: v.string(),
				vulnerabilities: v.string(),
				software_quality_maintainability_rating: v.string(),
			}),
		),
		createdAt: v.number(),
	}).index("by_userId", ["userId"]),

	hotspotList: defineTable({
		staticScanId: v.id("staticScans"),
		message: v.string(),
		vulnerabilityProbability: v.string(),
		component: v.string(),
		line: v.number(),
		review_status: v.boolean(),
	}).index("by_staticScanId", ["staticScanId"]),

	issueList: defineTable({
		staticScanId: v.id("staticScans"),
		message: v.string(),
		component: v.string(),
		line: v.number(),
		severity: v.string(),
		tags: v.array(v.string()),
	}).index("by_staticScanId", ["staticScanId"]),

	issueInfo: defineTable({
		issueId: v.id("issueList"),
		message: v.string(),
		component: v.string(),
		line: v.number(),
		severity: v.string(),
		rule: v.object({
			key: v.string(),
			name: v.string(),
			remediationSteps: v.array(
				v.object({
					context: v.string(),
					description: v.string(),
					problemCodeSnippet: v.string(),
					remediationCodeSnippet: v.string(),
				}),
			),
		}),
	}).index("by_issueId", ["issueId"]),
});
