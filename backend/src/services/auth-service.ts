import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from '../lib/crypto.js';
import { resolveOwnerId } from '../ownership/ownership.js';
import {
  refreshTokenRepository,
  type RefreshTokenRepository,
} from '../repositories/refresh-token-repository.js';
import {
  toPublicUser,
  userRepository,
  type PublicUser,
  type UserRepository,
} from '../repositories/user-repository.js';
import type { LoginBody, LogoutBody, RefreshBody, RegisterBody } from '../schemas/auth.js';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

function parseDurationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * multipliers[unit]!;
}

export class AuthService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly env: Env,
    private readonly users: UserRepository = userRepository,
    private readonly refreshTokens: RefreshTokenRepository = refreshTokenRepository,
  ) {}

  async register(input: RegisterBody): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Email is already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email,
      passwordHash,
      timezone: input.timezone,
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(input: LoginBody): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(input: RefreshBody): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(input.refreshToken, this.env.JWT_REFRESH_SECRET);
    const stored = await this.refreshTokens.findValidByHash(tokenHash);
    if (!stored) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    // Rotate: revoke current token before issuing a new pair.
    await this.refreshTokens.revokeByHash(tokenHash);

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    return this.issueTokens(user.id, user.email);
  }

  async logout(input: LogoutBody): Promise<void> {
    const tokenHash = hashRefreshToken(input.refreshToken, this.env.JWT_REFRESH_SECRET);
    await this.refreshTokens.revokeByHash(tokenHash);
  }

  async getCurrentUser(authenticatedUserId: string, clientUserId?: string): Promise<PublicUser> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const user = await this.users.findById(ownerId);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return toPublicUser(user);
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.app.jwt.sign(
      { sub: userId, email },
      { expiresIn: this.env.JWT_ACCESS_EXPIRES_IN },
    );

    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken, this.env.JWT_REFRESH_SECRET);
    const expiresAt = new Date(Date.now() + parseDurationToMs(this.env.JWT_REFRESH_EXPIRES_IN));

    await this.refreshTokens.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
