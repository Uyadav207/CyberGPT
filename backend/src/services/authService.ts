import type { PrismaClient } from "@prisma/client";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";

export class AuthService {
	private prisma: PrismaClient;

	constructor(prisma: PrismaClient) {
		this.prisma = prisma;
	}

	async register(
		firstName: string,
		lastName: string,
		username: string,
		email: string,
		password: string,
		avatar?: string,
	) {
		const existingUser = await this.prisma.user.findFirst({
			where: { OR: [{ email }, { username }] },
		});

		if (existingUser) {
			if (existingUser.email === email) throw new Error("Email already exists");
			throw new Error("Username already exists");
		}

		if (!password) throw new Error("Password is required");
		const hashedPassword = await hashPassword(password);

		return this.prisma.user.create({
			data: {
				firstName,
				lastName,
				username,
				email,
				password: hashedPassword,
				avatar,
			},
		});
	}

	async login(email: string, password: string) {
		const user = await this.prisma.user.findUnique({ where: { email } });
		if (!user) throw new Error("Invalid credentials");
		if (!user.password) throw new Error("Invalid credentials");

		const valid = await comparePasswords(password, user.password);
		if (!valid) throw new Error("Invalid credentials");
		return user;
	}
}
