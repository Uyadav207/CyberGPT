import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@components/ui/label";
import { profileSchema, USER_INITIAL_VALUES } from "./constants";
import type { ProfileValues } from "./constants";
import { showErrorToast } from "@components/toaster";
import { Loader2 } from "lucide-react";
import {
	Form,
	FormItem,
	FormControl,
	FormField,
	FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import type { FieldValues } from "react-hook-form";
import useStore from "../../store/store";
import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog } from "../dialog";
import { handleSubmit, handleDelete } from "./profile-actions";
import AvatarUpload from "./AvatarUpload";

const ProfileForm = () => {
	const user = useStore((state) => state.user);
	const [isDialog, setIsDialogOpen] = useState(false);
	const token = useStore((state) => state.token);
	const [, setUserIdToDelete] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<ProfileValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: user
			? {
					...user,
				}
			: USER_INITIAL_VALUES,
	});

	return (
		<div className="flex flex-col w-full bg-transparent px-4 md:px-8">
			<div className="flex justify-left items-left mb-10 px-20">
				<AvatarUpload userId={user?.id ?? ""} token={token || ""} />
			</div>
			<div className="flex justify-center items-center">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit((data) => {
							if (user) {
								handleSubmit(
									data,
									{ userId: user.id },
									setIsLoading,
								);
							} else {
								showErrorToast("User not found");
							}
						})}
						className="w-full max-w-4xl"
					>
						{/* Form Layout */}
						<div className="flex gap-8">
							<div className="flex flex-col gap-8 w-1/2">
								<FormField
									control={form.control}
									name="firstName"
									render={({
										field,
									}: { field: FieldValues }) => (
										<FormItem>
											<Label
												htmlFor="firstName"
												className="text-sm font-medium"
											>
												First Name
											</Label>
											<FormControl>
												<Input
													placeholder="First Name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="username"
									render={({
										field,
									}: { field: FieldValues }) => (
										<FormItem>
											<Label
												htmlFor="username"
												className="text-sm font-medium"
											>
												Username
											</Label>
											<FormControl>
												<Input
													placeholder="Username"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="flex flex-col gap-8 w-1/2">
								<FormField
									control={form.control}
									name="lastName"
									render={({
										field,
									}: { field: FieldValues }) => (
										<FormItem>
											<Label
												htmlFor="lastName"
												className="text-sm font-medium"
											>
												Last Name
											</Label>
											<FormControl>
												<Input
													placeholder="Last Name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({
										field,
									}: { field: FieldValues }) => (
										<FormItem>
											<Label
												htmlFor="email"
												className="text-sm font-medium"
											>
												Email
											</Label>
											<FormControl>
												<Input
													placeholder="Email"
													type="email"
													disabled={
														user?.authProvider ===
														"google"
													}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Submit Button */}
						<div className="mt-6 text-center">
							<Button
								className="flex items-center justify-center gap-2 px-6 py-2"
								type="submit"
								variant="default"
								disabled={
									isLoading ||
									Object.keys(form.formState.errors).length >
										0 ||
									(!form.formState.isDirty &&
										!form.formState.isSubmitting)
								}
							>
								{isLoading && (
									<Loader2 className="animate-spin text-blue-500" />
								)}
								Edit Details
							</Button>
						</div>
						<div className="mt-6 text-center">
							<Button
								type="button"
								variant="destructive"
								className="flex items-center justify-center gap-2 px-6 py-2 "
								onClick={() => {
									setUserIdToDelete(user?.id || null);
									setIsDialogOpen(true);
								}}
							>
								Delete Account
							</Button>
						</div>
					</form>
				</Form>
			</div>
			<Dialog
				onClose={() => setIsDialogOpen(false)}
				onConfirm={() => {
					if (user?.id) {
						handleDelete({ userId: user.id });
					} else {
						showErrorToast("User ID is missing.");
					}
				}}
				open={isDialog}
				title="Delete User"
				description="Are you sure you want to delete account? Once deleted cannot be retrieved!."
				onCancel={() => setIsDialogOpen(false)}
				confirmText="Delete"
				cancelText="Cancel"
			/>
		</div>
	);
};

export default ProfileForm;
