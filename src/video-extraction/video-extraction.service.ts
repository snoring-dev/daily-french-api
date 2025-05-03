import { Injectable, Logger } from '@nestjs/common';
import { YoutubeExtractionService } from './youtube-extraction.service';
import { FacebookExtractionService } from './facebook-extraction.service';
import { InstagramExtractionService } from './instagram-extraction.service';
import { TikTokExtractionService } from './tiktok-extraction.service';
import { VideoDTO } from './video-extraction.types';

@Injectable()
export class VideoExtractionService {
  private readonly logger = new Logger(VideoExtractionService.name);

  constructor(
    private readonly youtubeExtractionService: YoutubeExtractionService,
    private readonly facebookExtractionService: FacebookExtractionService,
    private readonly instagramExtractionService: InstagramExtractionService,
    private readonly tiktokExtractionService: TikTokExtractionService,
  ) {}

  async extractVideo(url: string): Promise<VideoDTO> {
    try {
      if (this.isYoutubeUrl(url)) {
        const ytbData =
          await this.youtubeExtractionService.extractYoutubeVideo(url);
        return Promise.resolve(this.transformVideoResponse('youtube', ytbData));
      }

      if (this.isFacebookUrl(url)) {
        try {
          const fbData =
            await this.facebookExtractionService.extractFacebookVideo(url);
          return Promise.resolve(
            this.transformVideoResponse('facebook', fbData),
          );
        } catch (error) {
          this.logger.warn(
            `Facebook yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
          );
        }
      }

      if (this.isInstagramUrl(url)) {
        try {
          const instaData =
            await this.instagramExtractionService.extractInstagramVideo(url);
          return Promise.resolve(
            this.transformVideoResponse('instagram', instaData),
          );
        } catch (error) {
          this.logger.warn(
            `Instagram yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
          );
        }
      }

      if (this.isTiktokUrl(url)) {
        try {
          const tiktokData =
            await this.tiktokExtractionService.extractTikTokVideo(url);
          return Promise.resolve(
            this.transformVideoResponse('tiktok', tiktokData),
          );
        } catch (error) {
          this.logger.warn(
            `TikTok yt-dlp extraction failed, falling back to HTML extraction: ${error.message}`,
          );
        }
      }

      throw new Error(`Unsupported video URL: ${url}`);
    } catch (error) {
      this.logger.error(`Video extraction failed: ${error.message}`);
      throw new Error(`Video extraction failed: ${error.message}`);
    }
  }

  transformVideoResponse(
    platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook',
    response: any,
  ): VideoDTO {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return this.transformTikTokResponse(response);
      case 'instagram':
        return this.transformInstagramResponse(response);
      case 'youtube':
        return this.transformYouTubeResponse(response);
      case 'facebook':
        return this.transformFacebookResponse(response);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
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

  private isTiktokUrl(url: string): boolean {
    return (
      url.includes('tiktok.com') ||
      url.includes('vm.tiktok.com') ||
      url.includes('tiktok.com/@') ||
      url.includes('tiktok.com/video/')
    );
  }

  private transformFacebookResponse(response: any): VideoDTO {
    return {
      videoUrl: this.getBestQualityUrl(response.formats),
      title: response.title || '',
      description: '',
      thumbnailUrl: response.thumbnail || '',
      author: '',
      downloadedVideoPath: response.downloadedVideoPath,
    };
  }

  private transformYouTubeResponse(response: any): VideoDTO {
    return {
      videoUrl: this.getBestQualityUrl(response.formats),
      title: response.title || '',
      description: '',
      thumbnailUrl: response.thumbnail || '',
      author: '',
      downloadedVideoPath: response.downloadedVideoPath,
    };
  }

  private transformInstagramResponse(response: any): VideoDTO {
    return {
      videoUrl: this.getBestQualityUrl(response.formats),
      title: response.title || '',
      description: '',
      thumbnailUrl: response.thumbnail || '',
      author: response.author || '',
      downloadedVideoPath: response.downloadedVideoPath,
    };
  }

  private transformTikTokResponse(response: any): VideoDTO {
    return {
      videoUrl: this.getBestQualityUrl(response.formats),
      title: response.title || '',
      description: '',
      thumbnailUrl: response.thumbnail || '',
      author: response.author || '',
      downloadedVideoPath: response.downloadedVideoPath,
    };
  }

  private getBestQualityUrl(formats: any): string {
    if (formats.high && formats.high.length > 0) {
      return formats.high[0].url;
    } else if (formats.medium && formats.medium.length > 0) {
      return formats.medium[0].url;
    } else if (formats.low && formats.low.length > 0) {
      return formats.low[0].url;
    } else if (formats.default) {
      return formats.default.url;
    }
    return '';
  }
}
