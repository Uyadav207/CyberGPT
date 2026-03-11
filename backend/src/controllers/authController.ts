import { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import { AuthService } from "../services/authService";
import { JwtService } from "../services/jwtService";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);
const jwtService = new JwtService();

export const register = async (c: Context) => {
	const { firstName, lastName, username, email, password, avatar } =
		await c.req.json();

	try {
		const user = await authService.register(
			firstName,
			lastName,
			username,
			email,
			password,
			avatar,
		);
		const token = jwtService.generateToken(user);
		const { password: _p, ...safeUser } = user;
		return c.json(
			{ user: { ...safeUser, id: user.id }, token },
			201,
		);
	} catch (error) {
		return c.json({ error: (error as Error).message }, 400);
	}
};

export const login = async (c: Context) => {
	const { email, password } = await c.req.json();

	try {
		const user = await authService.login(email, password);
		const token = jwtService.generateToken(user);
		const { password: _p, ...safeUser } = user;
		return c.json({ user: { ...safeUser, id: user.id }, token });
	} catch (error) {
		return c.json({ error: (error as Error).message }, 401);
	}
};
