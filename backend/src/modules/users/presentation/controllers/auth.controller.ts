/**
 * Auth Controller
 *
 * REST API controller for Authentication endpoints.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { RateLimitGuard, RateLimit } from '../../../../shared/auth/rate-limit.guard';
import {
  LoginDto,
  LoginResponseDto,
  LogoutDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '../dto/auth.dto';
import { UserLoginUseCase, UserLoginInput } from '../../application/user-login.use-case';
import { UserLogoutUseCase, UserLogoutInput } from '../../application/user-logout.use-case';
import { RefreshTokenUseCase, RefreshTokenInput } from '../../application/refresh-token.use-case';
import {
  PasswordResetRequestUseCase,
  PasswordResetRequestInput,
} from '../../application/password-reset-request.use-case';
import {
  PasswordResetConfirmUseCase,
  PasswordResetConfirmInput,
} from '../../application/password-reset-confirm.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly userLoginUseCase: UserLoginUseCase,
    private readonly userLogoutUseCase: UserLogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly passwordResetRequestUseCase: PasswordResetRequestUseCase,
    private readonly passwordResetConfirmUseCase: PasswordResetConfirmUseCase,
  ) {}

  /**
   * User login
   * POST /api/v1/auth/login
   */
  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user with email and password, returns access and refresh tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: Request,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginResponseDto> {
    const ipAddress = (req as any).ip || (req as any).connection?.remoteAddress;

    const input: UserLoginInput = {
      email: loginDto.email,
      password: loginDto.password,
      ipAddress,
      userAgent,
    };

    const result = await this.userLoginUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      user: result.data.user,
      expiresIn: result.data.expiresIn,
    };
  }

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Invalidates the current access token and refresh token',
  })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(
    @Body() logoutDto: LogoutDto,
    @Request() req: AuthenticatedRequest,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    const accessToken = authorization?.replace('Bearer ', '');
    if (!accessToken) {
      throw new Error('Access token not found in request');
    }

    const input: UserLogoutInput = {
      accessToken,
      refreshToken: logoutDto.refreshToken,
    };

    const result = await this.userLogoutUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Obtains a new access token using a valid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token expired or invalid',
  })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    const input: RefreshTokenInput = {
      refreshToken: refreshDto.refreshToken,
      rotateRefreshToken: false, // Can be made configurable
    };

    const result = await this.refreshTokenUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken || undefined,
      expiresIn: result.data.expiresIn,
    };
  }

  /**
   * Request password reset
   * POST /api/v1/auth/password-reset/request
   */
  @Post('password-reset/request')
  @UseGuards(RateLimitGuard)
  @RateLimit('password_reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user if the email exists',
  })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a password reset link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If the email exists, a password reset link has been sent.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset requests',
  })
  async passwordResetRequest(
    @Body() resetDto: PasswordResetRequestDto,
  ): Promise<{ message: string }> {
    const input: PasswordResetRequestInput = {
      email: resetDto.email,
    };

    const result = await this.passwordResetRequestUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  /**
   * Confirm password reset
   * POST /api/v1/auth/password-reset/confirm
   */
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm password reset',
    description: 'Resets the user password using a valid reset token',
  })
  @ApiBody({ type: PasswordResetConfirmDto })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password has been reset successfully.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or password does not meet requirements',
  })
  @ApiResponse({
    status: 401,
    description: 'Reset token expired or invalid',
  })
  async passwordResetConfirm(
    @Body() confirmDto: PasswordResetConfirmDto,
  ): Promise<{ message: string }> {
    const input: PasswordResetConfirmInput = {
      token: confirmDto.token,
      newPassword: confirmDto.newPassword,
    };

    const result = await this.passwordResetConfirmUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      message: 'Password has been reset successfully.',
    };
  }
}
