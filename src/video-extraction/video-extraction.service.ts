import { Injectable, Logger } from '@nestjs/common';
import { YoutubeExtractionService } from './youtube-extraction.service';

@Injectable()
export class VideoExtractionService {
  private readonly logger = new Logger(VideoExtractionService.name);

  constructor(
    private readonly youtubeExtractionService: YoutubeExtractionService,
  ) {}

  async extractVideo(url: string): Promise<any> {
    try {
      // Check if the URL is from YouTube
      if (this.isYoutubeUrl(url)) {
        return await this.youtubeExtractionService.extractYoutubeVideo(url);
      }
    } catch (error) {
      this.logger.error(`Video extraction failed: ${error.message}`);
      throw new Error(`Video extraction failed: ${error.message}`);
    }
  }

  private isYoutubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}
