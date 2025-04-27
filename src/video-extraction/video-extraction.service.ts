import { Injectable, Logger } from '@nestjs/common';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';

@Injectable()
export class VideoExtractionService {
  private readonly logger = new Logger(VideoExtractionService.name);

  constructor(
    private readonly youtubeExtractionService: YoutubeExtractionService,
    private readonly facebookExtractionService: FacebookExtractionService,
  ) {}

  async extractVideo(url: string): Promise<any> {
    try {
      // Check if the URL is from YouTube
      if (this.isYoutubeUrl(url)) {
        return await this.youtubeExtractionService.extractYoutubeVideo(url);
      }

      // Check if the URL is from Facebook
      if (this.isFacebookUrl(url)) {
        // Try the newer yt-dlp extraction method first
        try {
          return await this.facebookExtractionService.extractFacebookVideo(url);
        } catch (error) {
          // Fall back to the HTML scraping method if yt-dlp fails
          this.logger.warn(
            `Facebook yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
          );
          return await this.facebookExtractionService.extractFacebookVideoInfo(
            url,
          );
        }
      }

      throw new Error(`Unsupported video URL: ${url}`);
    } catch (error) {
      this.logger.error(`Video extraction failed: ${error.message}`);
      throw new Error(`Video extraction failed: ${error.message}`);
    }
  }

  private isYoutubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private isFacebookUrl(url: string): boolean {
    return (
      url.includes('facebook.com') ||
      url.includes('fb.com') ||
      url.includes('fb.watch') ||
      url.includes('mibextid=wwXIfr')
    );
  }
}
