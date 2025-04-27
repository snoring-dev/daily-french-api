import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/database.module';
import { UsersModule } from './users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from './auth/auth.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { AddressModule } from './address/address.module';
import { WordsModule } from './words/words.module';
import { VideoExtractionModule } from './video-extraction/video-extraction.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('SMTP_HOST'),
          port: configService.get('SMTP_PORT'),
          auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: '"No Reply" <snoring.dev@gmail.com>',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    FileUploadModule,
    AddressModule,
    WordsModule,
    VideoExtractionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
