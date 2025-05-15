import ProfileForm from "../components/profile/form";
import { Separator } from "@components/ui/separator";
import PassowrdForm from "../components/passsword/password-form";
import useStore from "../store/store";

const ProfileSettings = () => {
	const user = useStore((state) => state.user);
	return (
		<div className="flex flex-1 flex-col lg:flex-row overflow-hidden bg-background">
			<div className="flex flex-1 flex-col lg:flex-row">
				{/* Main Content */}
				<main className="flex-1 p-6 overflow-y-auto">
					<h1 className="text-2xl font-semibold mb-6">Accounts</h1>
					<ProfileForm />
					{user?.authProvider !== "google" && (
						<>
							<div className="my-6">
								<Separator />
							</div>
							<h1 className="text-2xl font-semibold mb-6">
								Passwords
							</h1>
							<PassowrdForm />
						</>
					)}
				</main>
			</div>
		</div>
	);
};

export default ProfileSettings;
