import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import { verifyPassword } from 'src/utils/passwords';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.getUserByEmail(email);
    const verification = await verifyPassword(user.hashedPassword, password);
    if (user && verification) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
