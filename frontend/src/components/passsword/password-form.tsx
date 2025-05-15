import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@components/ui/label";
import { passwordSchema } from "./constants";
import type { FieldValues } from "react-hook-form";
import { Loader2 } from "lucide-react";

import {
	Form,
	FormItem,
	FormControl,
	FormField,
	FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { handleVisibilityToggle, handleSubmit } from "./actions";
import type { PasswordValues } from "./constants";

const PassowrdForm = () => {
	const form = useForm<PasswordValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});
	const [isLoading, setIsLoading] = useState(false);

	const [passwordVisibility, setPasswordVisibility] = useState({
		currentPassword: false,
		newPassword: false,
		confirmPassword: false,
	});

	return (
		<div className="flex flex-col w-full bg-transparent px-4 md:px-8">
			<div className="flex justify-center items-center">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit((data) =>
							handleSubmit(data, form, setIsLoading),
						)}
						className="w-full max-w-4xl"
					>
						<div className="flex flex-col gap-8">
							{/* Current Password Field */}
							<FormField
								control={form.control}
								name="currentPassword"
								render={({ field }: { field: FieldValues }) => (
									<FormItem className="relative">
										<Label htmlFor="currentPassword">
											Current Password
										</Label>
										<FormControl>
											<div className="relative">
												<Input
													type={
														passwordVisibility.currentPassword
															? "text"
															: "password"
													}
													id="currentPassword"
													value={field.value ?? ""}
													{...field}
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													aria-label="Toggle current password visibility"
													onClick={() =>
														handleVisibilityToggle(
															"currentPassword",
															setPasswordVisibility,
														)
													}
												>
													{passwordVisibility.currentPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* New Password Field */}
							<FormField
								control={form.control}
								name="newPassword"
								render={({ field }: { field: FieldValues }) => (
									<FormItem className="relative">
										<Label htmlFor="newPassword">
											New Password
										</Label>
										<FormControl>
											<div className="relative">
												<Input
													type={
														passwordVisibility.newPassword
															? "text"
															: "password"
													}
													id="newPassword"
													{...field}
													className="w-full"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() =>
														handleVisibilityToggle(
															"newPassword",
															// passwordVisibility,
															setPasswordVisibility,
														)
													}
												>
													{passwordVisibility.newPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Confirm Password Field */}
							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }: { field: FieldValues }) => (
									<FormItem className="relative">
										<Label htmlFor="confirmPassword">
											Confirm Password
										</Label>
										<FormControl>
											<div className="relative">
												<Input
													type={
														passwordVisibility.confirmPassword
															? "text"
															: "password"
													}
													id="confirmPassword"
													{...field}
													className="w-full"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() =>
														handleVisibilityToggle(
															"confirmPassword",
															setPasswordVisibility,
														)
													}
												>
													{passwordVisibility.confirmPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="mt-6 text-center">
							<Button
								type="submit"
								variant="default"
								className="flex items-center justify-center gap-2 px-6 py-2"
								disabled={isLoading}
							>
								{isLoading && (
									<Loader2 className="animate-spin text-blue-500" />
								)}
								Change Password
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
};

export default PassowrdForm;
