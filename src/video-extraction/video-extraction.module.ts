import { Module } from '@nestjs/common';
import { VideoExtractionController } from './video-extraction.controller';
import { VideoExtractionService } from './video-extraction.service';
import { YoutubeExtractionService } from './youtube-extraction.service';

@Module({
  controllers: [VideoExtractionController],
  providers: [VideoExtractionService, YoutubeExtractionService],
  exports: [VideoExtractionService],
})
export class VideoExtractionModule {}
