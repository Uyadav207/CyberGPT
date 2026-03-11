import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
	const navigate = useNavigate();

	useEffect(() => {
		navigate("/login", { replace: true });
	}, [navigate]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-lg">Redirecting to login...</p>
		</div>
	);
}
