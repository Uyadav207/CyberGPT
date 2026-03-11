import type { LoginApiPayloadType } from "../types/auth";

export function splitName(fullName: string): {
	firstName: string;
	lastName: string;
} {
	const nameParts = fullName.trim().split(" ");
	if (nameParts.length === 1) {
		return { firstName: nameParts[0], lastName: "" };
	}
	const lastName = nameParts.pop() || "";
	const firstName = nameParts.join(" ");
	return { firstName, lastName };
}

export function createLoginResponseBody(data: LoginApiPayloadType): LoginApiPayloadType {
	return {
		email: data.email,
		password: data.password,
	};
}
