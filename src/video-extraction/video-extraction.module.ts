import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VideoExtractionController } from './video-extraction.controller';
import { VideoExtractionService } from './video-extraction.service';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';
import { InstagramExtractionService } from './instagram-extraction.service';
import { TikTokExtractionService } from './tiktok-extraction.service';

@Module({
  imports: [HttpModule],
  controllers: [VideoExtractionController],
  providers: [
    VideoExtractionService,
    YoutubeExtractionService,
    FacebookExtractionService,
    InstagramExtractionService,
    TikTokExtractionService,
  ],
  exports: [VideoExtractionService],
})
export class VideoExtractionModule {}
