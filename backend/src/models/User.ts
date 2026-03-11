export default interface User {
	id: string;
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	avatar: string | null;
	password: string | null;
	authProvider: string;
	createdAt: Date;
	updatedAt: Date;
}
