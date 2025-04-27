import { Module } from '@nestjs/common';
import { VideoExtractionController } from './video-extraction.controller';
import { VideoExtractionService } from './video-extraction.service';

@Module({
  controllers: [VideoExtractionController],
  providers: [VideoExtractionService],
  exports: [VideoExtractionService],
})
export class VideoExtractionModule {}
