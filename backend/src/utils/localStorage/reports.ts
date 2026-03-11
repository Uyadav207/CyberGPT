import * as fs from "node:fs/promises";
import * as path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "reports");

export async function uploadReportAndGetUrl(file: File): Promise<string | null> {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
		const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
		const filePath = path.join(UPLOAD_DIR, fileName);
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(filePath, buffer);
		const baseUrl = process.env.BASE_URL || process.env.API_URL || "";
		return baseUrl ? `${baseUrl.replace(/\/$/, "")}/uploads/reports/${fileName}` : `/uploads/reports/${fileName}`;
	} catch (err) {
		console.error("Report upload error:", err);
		return null;
	}
}

export async function downloadPdfReportFile(fileName: string): Promise<Blob> {
	const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
	const data = await fs.readFile(filePath);
	return new Blob([data], { type: "application/pdf" });
}

export async function deletePDF(fileName: string): Promise<boolean> {
	try {
		const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
		await fs.unlink(filePath);
		return true;
	} catch {
		return false;
	}
}
