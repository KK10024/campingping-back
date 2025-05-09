import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@Injectable()
export class JwtWsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const rawCookies = client.handshake.headers.cookie;

    const parsedCookies = cookie.parse(rawCookies);
    const token = parsedCookies['accessToken'];

    if (!token) {
      console.error('[ERROR] accessToken이 없습니다.');
      return false;
    }
    try {
      const user = this.jwtService.verify(token);
      client.data.user = user;
      return true;
    } catch (error) {
      console.error('[ERROR] JWT 검증 오류:', error.message);
      return false;
    }
  }
}
