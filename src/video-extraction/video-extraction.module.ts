import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VideoExtractionController } from './video-extraction.controller';
import { VideoExtractionService } from './video-extraction.service';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';

@Module({
  imports: [HttpModule],
  controllers: [VideoExtractionController],
  providers: [
    VideoExtractionService,
    YoutubeExtractionService,
    FacebookExtractionService,
  ],
  exports: [VideoExtractionService],
})
export class VideoExtractionModule {}
