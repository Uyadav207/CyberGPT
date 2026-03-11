import axiosInstance from "./axios";
import type {
	LoginApiPayloadType,
	RegisterApiPayloadType,
	ResetPasswordApiPayloadType,
	SendOTPApiPayloadType,
	VerifyOTPApiPayloadType,
} from "../types/auth";

const login = (payload: LoginApiPayloadType) =>
	axiosInstance.post("/auth/login", payload);

const register = (payload: RegisterApiPayloadType) =>
	axiosInstance.post("/auth/register", payload);

const sendOTP = (payload: SendOTPApiPayloadType) =>
	axiosInstance.post("/users/user/reset_req", payload);

const verifyOTP = (payload: VerifyOTPApiPayloadType) =>
	axiosInstance.post("/users/user/verify", payload);

const resetPassword = (payload: ResetPasswordApiPayloadType) =>
	axiosInstance.post("/users/user/resetpass", payload);

export const authApis = {
	login,
	register,
	sendOTP,
	verifyOTP,
	resetPassword,
};
