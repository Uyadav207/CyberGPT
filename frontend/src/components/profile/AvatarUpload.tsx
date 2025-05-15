import type React from "react";
import { useState, useCallback } from "react";
import useStore from "../../store/store";
import { updateAvatar } from "../../api/profile-settings";
import type { User } from "../../types/user";
import { showErrorToast, showSuccessToast } from "../toaster";

interface AvatarUploadProps {
	userId: string;
	token: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ userId, token }) => {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const { user, setUser } = useStore();

	const onFileChange = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			try {
				const file = event.target.files?.[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onloadend = () => {
					setPreviewUrl(reader.result as string);
				};
				reader.readAsDataURL(file);
				const response = await updateAvatar(userId, file, token);
				if (response?.data) {
					const updatedUser: User = response.data.user;
					setUser(updatedUser);
					setPreviewUrl(updatedUser.avatar || null);
					showSuccessToast("woah! You look awesome");
				} else {
					showErrorToast("phhhh... cannot update avatar");
				}
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(
						`Failed to update avatar. Please try again. ${error.message}`,
					);
				}
			}
		},
		[userId, token, setUser],
	);

	const handlePreviewClick = useCallback(() => {
		document.getElementById("avatar-upload")?.click();
	}, []);

	return (
		<div className="avatar-upload-container">
			<input
				type="file"
				id="avatar-upload"
				accept="image/*"
				onChange={onFileChange}
				style={{ display: "none" }}
			/>
			<button
				type="button"
				className="avatar-preview"
				onClick={handlePreviewClick}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						handlePreviewClick();
					}
				}}
				style={{
					width: "150px",
					height: "150px",
					borderRadius: "50%",
					overflow: "hidden",
					cursor: "pointer",
					padding: 0,
					border: "none",
					background: "none",
				}}
			>
				<img
					src={previewUrl || user?.avatar || "/logo.jpg"}
					alt="User Avatar"
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			</button>
		</div>
	);
};

export default AvatarUpload;
