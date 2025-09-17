import axiosInstance from "./axios";
import { BASE_URL } from "./config.backend";


interface ChatOllamaPayload {
  prompt: string;
}

interface ScanPayload {
  website: string;
  selectedStandard: string;
}

// New GraphRAG response interface
// interface GraphRAGResponse {
//   answer: string;
//   reasoningTrace: Array<{
//     step: string;
//     message: string;
//   }>;
//   jargons?: { term: string; description: string }[];
//   cveDescriptionsMap?: Record<string, string>;
//   dynamicTag?: string;
//   contextData?: {
//     cveIds: string[];
//     cveDescriptions: string[];
//     riskLevels: string[];
//     mitigations: string[];
//     concept: string;
//   };
//   sourceLinks?: Array<{
//     title: string;
//     url: string;
//     type: "official" | "reference" | "framework";
//   }>;
// }

// Old chatGraphRAG function removed - now using chatWithJargon instead

// Old chat function removed - now using chatWithJargon instead

const chatOllama = async (payload: ChatOllamaPayload) => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.body) {
    throw new Error("No response body");
  }

  return response.body; // Return the readable stream for processing
};

const scan = (payload: ScanPayload) => axiosInstance.post("/api/scan", payload);

interface GenerateTitlePayload {
  botMessage: string;
}

const generateTitle = (payload: GenerateTitlePayload) =>
  axiosInstance.post("/chat/title", payload);

const chatSummaryOllama = async (payload: { messages: string[] }) => {
  const response = await fetch(`${BASE_URL}/api/chat/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.body) {
    throw new Error("No response body");
  }

  return response.body; // Return the readable stream for processing
};

const chatSummaryOpenAI = async (payload: { messages: string[] }) => {
  const response = await fetch(`${BASE_URL}/chat/chat-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.body) {
    throw new Error("No response body");
  }

  return response; // Return the readable stream for processing
};

// Add a new function to call the backend chatWithJargon endpoint with automatic graph generation
export const chatWithJargon = async (payload: {
  message: string;
  agentPersonality?: string;
  messageId?: string;
  chatId?: string;
}) => {
  console.log(
    "DEBUG: Calling chatWithJargon endpoint:",
    `${BASE_URL}/chat/with-jargon`
  );
  console.log("DEBUG: Payload:", payload);
  const response = await fetch(`${BASE_URL}/chat/with-jargon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get answer");
  }
  const result = await response.json();
  // Normalize reasoning field for consumers: ensure reasoningTrace always exists
  const normalized = { ...result } as any;
  if (normalized.trace && !normalized.reasoningTrace) {
    normalized.reasoningTrace = normalized.trace;
  }
  console.log("DEBUG: chatWithJargon response:", normalized);
  return normalized;
};

export const chatApis = {
  chatOllama,
  scan,
  generateTitle,
  chatSummaryOllama,
  chatSummaryOpenAI,
};
