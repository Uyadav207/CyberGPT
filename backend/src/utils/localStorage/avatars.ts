import * as fs from "node:fs/promises";
import * as path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

export async function uploadImageAndGetUrl(file: File): Promise<string | null> {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
		const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
		const filePath = path.join(UPLOAD_DIR, fileName);
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(filePath, buffer);
		const baseUrl = process.env.BASE_URL || process.env.API_URL || "";
		return baseUrl ? `${baseUrl.replace(/\/$/, "")}/uploads/avatars/${fileName}` : `/uploads/avatars/${fileName}`;
	} catch (err) {
		console.error("Avatar upload error:", err);
		return null;
	}
}
