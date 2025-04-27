import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { VideoExtractionService } from './video-extraction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VideoExtractionDto } from './video-extraction.types';

@Controller('video-extraction')
@UseGuards(JwtAuthGuard)
export class VideoExtractionController {
  constructor(
    private readonly videoExtractionService: VideoExtractionService,
  ) {}

  @Get()
  getHello(): string {
    return this.videoExtractionService.getHello();
  }

  @Post()
  extractVideo(@Body() videoExtractionDto: VideoExtractionDto): Promise<any> {
    return this.videoExtractionService.extractVideo(
      videoExtractionDto.sourceUrl,
    );
  }
}
