import axiosInstance from "./axios";

const getLatestCVEs = () => axiosInstance.get("/rag/latest-cves");
const sendRagQuery = (question: string) =>
	axiosInstance.post("/rag/query", {
		question,
	});

const sendGraphRagQuery = (question: string) =>
  axiosInstance.post("/api/graphrag/query", { question });

export const ragApis = {
	getLatestCVEs,
	sendRagQuery,
  sendGraphRagQuery,
};
