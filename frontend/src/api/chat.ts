import axiosInstance from "./axios";
import { BASE_URL } from "./config.backend";

interface ChatPayload {
  message: string;
  useRAG?: boolean;
  previousMessages?: ChatMessage[];
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatOllamaPayload {
  prompt: string;
}

interface ScanPayload {
  website: string;
  selectedStandard: string;
}

// New GraphRAG response interface
interface GraphRAGResponse {
  answer: string;
  reasoningTrace: Array<{
    step: string;
    message: string;
  }>;
  jargons?: { term: string; description: string }[];
  cveDescriptionsMap?: Record<string, string>;
  dynamicTag?: string;
  contextData?: {
    cveIds: string[];
    cveDescriptions: string[];
    riskLevels: string[];
    mitigations: string[];
    concept: string;
  };
}

// New GraphRAG chat function
const chatGraphRAG = async (payload: {
  question: string;
}): Promise<GraphRAGResponse> => {
  const response = await fetch(`${BASE_URL}/chat/message/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get answer");
  }

  const data = await response.json();

  // Handle case where response might be a stringified JSON
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch (e) {
      throw new Error("Invalid JSON response from server");
    }
  }

  // Validate the response structure
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response format from server");
  }

  if (!data.answer || typeof data.answer !== "string") {
    throw new Error("Missing or invalid answer in response");
  }

  if (!Array.isArray(data.reasoningTrace)) {
    throw new Error("Missing or invalid reasoning trace in response");
  }

  return data;
};

const chat = async (payload: ChatPayload) => {
  const response = await fetch(`${BASE_URL}/chat/message/stream`, {
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

// Add a new function to call the backend chatWithJargon endpoint
export const chatWithJargon = async (payload: {
  message: string;
  agentPersonality?: string;
}) => {
  const response = await fetch(`${BASE_URL}/chat/with-jargon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get answer");
  }
  return response.json();
};

export const chatApis = {
  chatOllama,
  chat,
  chatGraphRAG, // Add the new GraphRAG function
  scan,
  generateTitle,
  chatSummaryOllama,
  chatSummaryOpenAI,
};
