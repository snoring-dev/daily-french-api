import { Injectable, Logger } from '@nestjs/common';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';
import { InstagramExtractionService } from './instagram-extraction.service';

@Injectable()
export class VideoExtractionService {
  private readonly logger = new Logger(VideoExtractionService.name);

  constructor(
    private readonly youtubeExtractionService: YoutubeExtractionService,
    private readonly facebookExtractionService: FacebookExtractionService,
    private readonly instagramExtractionService: InstagramExtractionService,
  ) {}

  async extractVideo(url: string): Promise<any> {
    try {
      // Check if the URL is from YouTube
      if (this.isYoutubeUrl(url)) {
        return await this.youtubeExtractionService.extractYoutubeVideo(url);
      }

      // Check if the URL is from Facebook
      if (this.isFacebookUrl(url)) {
        // First try with yt-dlp extraction
        try {
          return await this.facebookExtractionService.extractFacebookVideo(url);
        } catch (error) {
          // Fall back to HTML scraping method if yt-dlp fails
          this.logger.warn(
            `Facebook yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
          );
        }
      }

      if (this.isInstagramUrl(url)) {
        try {
          return await this.instagramExtractionService.extractInstagramVideo(
            url,
          );
        } catch (error) {
          // Fall back to HTML scraping method if yt-dlp fails
          this.logger.warn(
            `Instagram yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
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

  private isInstagramUrl(url: string): boolean {
    return (
      url.includes('instagram.com') ||
      url.includes('instagr.am') ||
      url.includes('instagram.com/reel') ||
      url.includes('instagram.com/p/') ||
      url.includes('igsh=')
    );
  }
}
