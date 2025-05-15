export const BASE_URL =
	import.meta.env.VITE_NODE_ENV === "development"
		? import.meta.env.VITE_BACKEND_BASE_URL
		: import.meta.env.VITE_PRODUCTION_BACKEND_BASE_URL;
