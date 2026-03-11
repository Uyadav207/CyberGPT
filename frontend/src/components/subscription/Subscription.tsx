import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import useStore from "../../store/store";

export default function Subscription() {
	const { user } = useStore();
	const plan = (user as { subscription?: string })?.subscription ?? "FREE";

	return (
		<div className="container mx-auto max-w-md px-4 py-16">
			<h1 className="mb-8 text-center text-3xl font-bold">Subscription</h1>
			<Card>
				<CardHeader>
					<CardTitle>Current plan</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-xl font-medium capitalize">{plan.toLowerCase()}</p>
					<p className="mt-2 text-sm text-muted-foreground">
						All users are on the free plan. No payment required.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
