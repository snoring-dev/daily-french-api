import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { eq } from 'drizzle-orm';
import { users } from 'src/db/schema';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { hashPassword } from 'src/utils/passwords';
import { Ranking } from 'src/utils/word_ranking';

@Injectable()
export class UserService {
  constructor(
    @Inject('DATABASE') private db: any,
    private readonly mailerService: MailerService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private generateVerificationCode(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  async registerUser(email: string, phoneNumber: string, password: string) {
    const hashedPassword = await hashPassword(password);
    const verificationCode = this.generateVerificationCode();

    try {
      const [user] = await this.db
        .insert(users)
        .values({
          email,
          phoneNumber,
          hashedPassword,
          verificationToken: verificationCode,
        })
        .returning();

      try {
        await this.sendVerificationEmail(email, verificationCode);
      } catch (emailError) {
        // If email sending fails, we should delete the created user and throw the error
        await this.db.delete(users).where(eq(users.id, user.id));
        throw emailError;
      }

      return { id: user.id, email: user.email, phoneNumber: user.phoneNumber };
    } catch (error) {
      // Unique constraint violation
      if (error.code === '23505') {
        throw new ConflictException('Email or phone number already exists');
      }
      if (error.message?.includes('Email address is not verified')) {
        throw new BadRequestException(
          'The sender email address is not verified in AWS SES. Please contact support.',
        );
      }
      throw error;
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <strong>${code}</strong></p>`,
      });
    } catch (error) {
      if (error.message?.includes('Email address is not verified')) {
        throw new BadRequestException(
          'Cannot send verification email: The recipient email address needs to be verified in AWS SES sandbox mode.',
        );
      }
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again later or contact support.',
      );
    }
  }

  async resendVerificationCode(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailConfirmation) {
      throw new BadRequestException('Email already verified');
    }

    const newVerificationCode = this.generateVerificationCode();

    try {
      await this.db
        .update(users)
        .set({ verificationToken: newVerificationCode })
        .where(eq(users.id, user.id));

      await this.sendVerificationEmail(email, newVerificationCode);

      return { message: 'New verification code sent' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to resend verification code. Please try again later.',
      );
    }
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailConfirmation) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationToken !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.db
      .update(users)
      .set({ emailConfirmation: true, verificationToken: null })
      .where(eq(users.id, user.id));

    return { message: 'Email verified successfully' };
  }

  async getUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async getUserById(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        pictureUrl: true,
        emailConfirmation: true,
        languageLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.pictureUrl) {
      const pictureUrl = await this.fileUploadService.getPresignedUrl(
        user.pictureUrl,
      );

      return {
        ...user,
        pictureUrl,
      };
    }

    return user;
  }

  async updateUserInfo(
    userId: number,
    updateData: Partial<{
      firstName: string;
      lastName: string;
      phoneNumber: string;
      resetCode: string;
      resetCodeExpires: Date;
      hashedPassword: string;
      languageLevel: Ranking;
    }>,
  ) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async updateProfilePicture(
    userId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const key = `profile-pictures/${userId}-${Date.now()}-${file.originalname}`;
    const s3Key = await this.fileUploadService.uploadFile(file, key);

    await this.db
      .update(users)
      .set({ pictureUrl: s3Key })
      .where(eq(users.id, userId));

    return s3Key;
  }

  async getProfilePictureUrl(userId: number): Promise<string> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.pictureUrl) {
      throw new NotFoundException('Profile picture not found');
    }

    return this.fileUploadService.getPresignedUrl(user.pictureUrl);
  }

  async generateResetCode(email: string): Promise<string> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const resetCode = this.generateVerificationCode();
    const resetCodeExpires = new Date(Date.now() + 3600000);

    await this.updateUserInfo(user.id, {
      resetCode: resetCode,
      resetCodeExpires: resetCodeExpires,
    });

    return resetCode;
  }

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);

    if (
      !user ||
      user.resetCode !== code ||
      user.resetCodeExpires < new Date()
    ) {
      return false;
    }

    return true;
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.getUserByEmail(email);

    if (!user || user.resetCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.updateUserInfo(user.id, {
      hashedPassword: hashedPassword,
      resetCode: null,
      resetCodeExpires: null,
    });
  }
}
