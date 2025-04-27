import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface FacebookVideoData {
  videoUrl: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
  publishedDate?: string;
  viewCount?: string;
}

@Injectable()
export class FacebookExtractionService {
  private readonly logger = new Logger(FacebookExtractionService.name);

  constructor(private readonly httpService: HttpService) {}

  async extractFacebookVideo(url: string): Promise<any> {
    try {
      // Use yt-dlp for Facebook video extraction
      return await this.extractWithYtDlp(url);
    } catch (error) {
      this.logger.warn(`Facebook yt-dlp extraction failed: ${error.message}`);
      throw new Error(`Facebook video extraction failed: ${error.message}`);
    }
  }

  private async extractWithYtDlp(url: string): Promise<any> {
    try {
      // Enhanced options for more reliable extraction
      const baseArgs = '--no-check-certificates --no-warnings --no-progress';

      // Facebook-specific settings to bypass restrictions
      const fbArgs = '--add-header "Accept-Language: en-US,en;q=0.9"';

      // Don't limit format selection - get all available formats
      const formatArgs = '-f "bestvideo+bestaudio/best"';

      // Request complete information
      const outputArgs = '--print-json';

      // Prevent partial file creation and use a simple output name to avoid filename-too-long errors
      const fileArgs = '--no-part --output "fb_video_%(id)s.%(ext)s"';

      // Combine all arguments
      const fullCommand = `yt-dlp ${baseArgs} ${fbArgs} ${formatArgs} ${outputArgs} ${fileArgs} "${url}"`;

      // Execute with timeout for safety
      const { stdout } = await execAsync(fullCommand, { timeout: 30000 });

      // Parse the JSON response
      const fullData = JSON.parse(stdout);

      // Extract video info with all quality options
      return {
        id: fullData.id || this.extractVideoId(url),
        title: fullData.title || 'Facebook Video',
        defaultUrl: this.getBestVideoUrl(fullData),
        thumbnail: fullData.thumbnail,
        duration: fullData.duration,
        formats: this.categorizeFormats(fullData.formats),
      };
    } catch (error) {
      this.logger.error(`Facebook yt-dlp extraction failed: ${error.message}`);
      throw new Error(`Facebook video extraction failed: ${error.message}`);
    }
  }

  // Get the best default video URL for immediate playback
  private getBestVideoUrl(data: any): string {
    // Filter out storyboard and ensure both audio and video
    const videoFormats = data.formats.filter(
      (format) =>
        !format.format_note?.includes('storyboard') &&
        format.vcodec !== 'none' &&
        format.acodec !== 'none',
    );

    // Sort by quality
    videoFormats.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

    // Return the best format URL
    return videoFormats.length > 0 ? videoFormats[0].url : null;
  }

  // Categorize formats by quality for user selection
  private categorizeFormats(formats: any[]): any {
    if (!formats || !Array.isArray(formats)) return {};

    // Filter playable formats (with both audio and video)
    const playableFormats = formats.filter(
      (format) =>
        format.vcodec !== 'none' &&
        format.acodec !== 'none' &&
        !format.format_note?.includes('storyboard'),
    );

    // Sort by quality
    playableFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

    // Group by resolution
    const qualityOptions = {
      // High quality (1080p+)
      high: playableFormats
        .filter((f) => f.height >= 1080)
        .map(this.formatVideoInfo),

      // Medium quality (720p)
      medium: playableFormats
        .filter((f) => f.height >= 720 && f.height < 1080)
        .map(this.formatVideoInfo),

      // Low quality (below 720p)
      low: playableFormats
        .filter((f) => f.height < 720)
        .map(this.formatVideoInfo),

      // Default option (best available with reasonable size)
      default: this.selectDefaultFormat(playableFormats),
    };

    return qualityOptions;
  }

  // Format video info
  private formatVideoInfo(format: any): any {
    return {
      format_id: format.format_id,
      quality: `${format.height}p`,
      url: format.url,
      resolution: `${format.width}x${format.height}`,
      filesize: format.filesize || format.filesize_approx,
      tbr: format.tbr,
      fps: format.fps || 30,
    };
  }

  // Select best default format (balancing quality vs size)
  private selectDefaultFormat(formats: any[]): any {
    // Prefer 1080p if available and not too large
    const fullHD = formats.find((f) => f.height === 1080);
    if (fullHD) {
      return this.formatVideoInfo(fullHD);
    }

    // Otherwise prefer 720p
    const hd = formats.find((f) => f.height === 720);
    if (hd) {
      return this.formatVideoInfo(hd);
    }

    // Fall back to highest available
    return formats.length > 0 ? this.formatVideoInfo(formats[0]) : null;
  }

  private extractVideoId(url: string): string {
    // Extract Facebook video ID from URL
    // Example URL: https://www.facebook.com/share/r/19RJo3fmie/?mibextid=wwXIfr

    // Try to get ID from /share/r/ format
    if (url.includes('/share/r/')) {
      const match = url.match(/\/share\/r\/([^/?]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to get ID from /watch/ format
    if (url.includes('/watch/')) {
      const match = url.match(/\/watch\/?\?v=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to get ID from /videos/ format
    if (url.includes('/videos/')) {
      const match = url.match(/\/videos\/([^/?]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback to using entire URL hash
    return this.generateHashFromUrl(url);
  }

  private generateHashFromUrl(url: string): string {
    // Create a simple hash from the URL if we can't extract ID
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }
}
