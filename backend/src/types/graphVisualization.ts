export interface GraphGenerationRequest {
  messageId: string;
  chatId: string;
  question: string;
  answer: string;
  reasoning?: string;
  sources?: string[];
  jargons?: Record<string, string>;
  cveInfo?: {
    cve_id?: string;
    cve_desc?: string;
    mitigation?: string;
  };
}

export interface GraphGenerationResponse {
  success: boolean;
  graphData?: any;
  error?: string;
}
