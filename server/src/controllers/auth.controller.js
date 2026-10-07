import * as authService from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../services/auth.service.js';
import { asyncHandler, successResponse } from '../utils/helpers.js';

export const signup = asyncHandler(async (req, res) => {
  await authService.signup(req.body);
  const { accessToken, refreshToken, user } = await authService.login({
    email: req.body.email,
    password: req.body.password,
    deviceInfo: req.headers['user-agent'] || null,
    ip: req.ip,
  });
  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(
    res,
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    201,
  );
});

export const login = asyncHandler(async (req, res) => {
  const deviceInfo = req.headers['user-agent'] || null;
  const ip = req.ip;

  const { accessToken, refreshToken, user } = await authService.login({
    ...req.body,
    deviceInfo,
    ip,
  });

  setAuthCookies(res, accessToken, refreshToken);

  return successResponse(res, {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  const deviceInfo = req.headers['user-agent'] || null;
  const ip = req.ip;

  const { accessToken, refreshToken } = await authService.refreshTokens(
    rawRefreshToken,
    deviceInfo,
    ip,
  );

  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(res, { message: 'Tokens refreshed' });
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  await authService.logout(req.user._id, rawRefreshToken);
  clearAuthCookies(res);
  return successResponse(res, { message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  clearAuthCookies(res);
  return successResponse(res, { message: 'All sessions revoked' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  // Always return success to prevent user enumeration
  return successResponse(res, {
    message: 'If an account exists with that email/phone, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return successResponse(res, { message: 'Password reset successfully. Please log in again.' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  return successResponse(res, user);
});
