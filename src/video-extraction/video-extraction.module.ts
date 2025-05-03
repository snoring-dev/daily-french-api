import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VideoExtractionController } from './video-extraction.controller';
import { VideoExtractionService } from './video-extraction.service';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';
import { InstagramExtractionService } from './instagram-extraction.service';
import { TikTokExtractionService } from './tiktok-extraction.service';
import { S3Service } from '../file-upload/s3.service';

@Module({
  imports: [HttpModule],
  controllers: [VideoExtractionController],
  providers: [
    VideoExtractionService,
    YoutubeExtractionService,
    FacebookExtractionService,
    InstagramExtractionService,
    TikTokExtractionService,
    S3Service,
  ],
  exports: [VideoExtractionService],
})
export class VideoExtractionModule {}
