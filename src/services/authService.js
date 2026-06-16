/**
 * Auth Service
 *
 * Wraps all authentication API calls against the API Gateway.
 * User identity is read directly from JWT claims — no extra API call needed.
 */

import { apiClient, refreshClient } from './apiClient'
import { tokenService } from './tokenService'
import { DEFAULT_PERMISSIONS, permissionsFromClaims } from '../models/Employee'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decode the payload section of a JWT without verifying the signature.
 * Safe to use client-side — we trust the token we just received from our server.
 */
function decodeJwtPayload(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

function buildUserPayload(claims) {
  const permissionClaims = claims.dozvole ?? []
  const upper = permissionClaims.map((c) => c.toUpperCase())
  const isAdmin = upper.includes('ADMIN')
  return {
    id:          claims.user_id,
    firstName:   claims.first_name ?? '',
    lastName:    claims.last_name  ?? '',
    email:       claims.email      ?? '',
    roles:       isAdmin ? ['ADMIN'] : ['USER'],
    permissions: isAdmin
      ? Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS).map((k) => [k, true]))
      : permissionsFromClaims(permissionClaims),
  }
}

// ── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Log in with email + password.
   * POST /login → { access_token, refresh_token } OR { requires_totp, session_token }
   * Returns user payload on success, or { requiresTotp: true, sessionToken } for 2FA step.
   */
  async login(email, password) {
    const { data } = await apiClient.post('/login', { email, password })
    if (data.requires_totp) {
      return { requiresTotp: true, sessionToken: data.session_token }
    }
    tokenService.setAccessToken(data.access_token)
    tokenService.setRefreshToken(data.refresh_token)
    return buildUserPayload(decodeJwtPayload(data.access_token))
  },

  /**
   * Complete login after TOTP verification.
   * POST /auth/totp/validate → { access_token, refresh_token }
   */
  async validateTotpLogin(sessionToken, code) {
    const { data } = await apiClient.post('/auth/totp/validate', {
      session_token: sessionToken,
      code,
    })
    tokenService.setAccessToken(data.access_token)
    tokenService.setRefreshToken(data.refresh_token)
    return buildUserPayload(decodeJwtPayload(data.access_token))
  },

  /** POST /auth/totp/generate → { secret, otpauth_uri, qr_code_png } */
  async generateTotpSecret() {
    const { data } = await apiClient.post('/auth/totp/generate')
    return data
  },

  /** POST /auth/totp/verify — verify and enable TOTP */
  async verifyTotp(code) {
    const { data } = await apiClient.post('/auth/totp/verify', { code })
    return data
  },

  /** DELETE /auth/totp — disable TOTP */
  async disableTotp() {
    await apiClient.delete('/auth/totp')
  },

  /**
   * Exchange the stored refresh token for a new access token.
   * Called automatically by the apiClient interceptor — rarely called directly.
   * POST /refresh → { access_token }
   */
  async refresh() {
    const refreshToken = tokenService.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token available.')
    const { data } = await refreshClient.post('/refresh', { refresh_token: refreshToken })
    tokenService.setAccessToken(data.access_token)
    return data.access_token
  },

  /**
   * Activate a new employee account using the token from the email link.
   * POST /auth/activate → { message }
   */
  async activate(token, password, confirmPassword) {
    await apiClient.post('/auth/activate', {
      token,
      password,
      confirm_password: confirmPassword,
    })
  },

  /**
   * Request a password reset email for the given address.
   * POST /auth/forgot-password → { message }
   */
  async forgotPassword(email) {
    await apiClient.post('/auth/forgot-password', { email })
  },

  /**
   * Reset a password using the token from the reset email link.
   * POST /auth/reset-password → { message }
   */
  async resetPassword(token, password, confirmPassword) {
    await apiClient.post('/auth/reset-password', {
      token,
      password,
      confirm_password: confirmPassword,
    })
  },

  /**
   * Log out the current user.
   * Notifies the backend to revoke the token, then clears local storage.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } catch (_) {
      // best-effort — clear locally regardless
    }
    tokenService.clear()
  },

  /**
   * Attempt to restore a session from a stored refresh token.
   * Called once on app load to silently re-authenticate.
   * Returns the user payload or null.
   */
  async restoreSession() {
    const refreshToken = tokenService.getRefreshToken()
    if (!refreshToken) return null
    try {
      const accessToken = await authService.refresh()
      return buildUserPayload(decodeJwtPayload(accessToken))
    } catch {
      tokenService.clear()
      return null
    }
  },
}