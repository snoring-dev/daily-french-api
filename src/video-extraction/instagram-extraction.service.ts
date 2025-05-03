import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface InstagramVideoData {
  videoUrl: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
  publishedDate?: string;
  viewCount?: string;
}

@Injectable()
export class InstagramExtractionService {
  private readonly logger = new Logger(InstagramExtractionService.name);

  constructor() {}

  async extractInstagramVideo(url: string): Promise<any> {
    try {
      return await this.extractWithYtDlp(url);
    } catch (error) {
      this.logger.warn(`Instagram yt-dlp extraction failed: ${error.message}`);
      throw new Error(`Instagram video extraction failed: ${error.message}`);
    }
  }

  private async extractWithYtDlp(url: string): Promise<any> {
    try {
      // Enhanced options for more reliable extraction
      const baseArgs = '--no-check-certificates --no-warnings --no-progress';

      // Instagram-specific settings to bypass restrictions
      const igArgs =
        '--add-header "Accept-Language: en-US,en;q=0.9" --add-header "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"';

      // Don't limit format selection - get all available formats
      const formatArgs = '-f "bestvideo+bestaudio/best"';

      // Request complete information
      const outputArgs = '--print-json';

      // Prevent partial file creation and use a simple output name to avoid filename-too-long errors
      const fileArgs =
        '--no-part --output "public/videos/ig_video_%(id)s.%(ext)s"';

      // Combine all arguments
      const fullCommand = `yt-dlp ${baseArgs} ${igArgs} ${formatArgs} ${outputArgs} ${fileArgs} "${url}"`;

      // Execute with timeout for safety
      const { stdout } = await execAsync(fullCommand, { timeout: 30000 });

      // Parse the JSON response
      const fullData = JSON.parse(stdout);

      const downloadedVideoPath = `public/videos/ig_video_${fullData.id}.${fullData.ext || 'mp4'}`;

      // Extract video info with all quality options
      return {
        id: fullData.id || this.extractVideoId(url),
        title: fullData.title || 'Instagram Video',
        defaultUrl: this.getBestVideoUrl(fullData),
        thumbnail: fullData.thumbnail,
        duration: fullData.duration,
        formats: this.categorizeFormats(fullData.formats),
        author: fullData.uploader || fullData.channel || '',
        downloadedVideoPath,
      };
    } catch (error) {
      this.logger.error(`Instagram yt-dlp extraction failed: ${error.message}`);
      throw new Error(`Instagram video extraction failed: ${error.message}`);
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
    // Extract Instagram video ID from URL
    // Example URL: https://www.instagram.com/reel/CzQQMykI-aL/

    // Try to get ID from /reel/ format
    if (url.includes('/reel/')) {
      const match = url.match(/\/reel\/([^/?]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to get ID from /p/ format (regular posts)
    if (url.includes('/p/')) {
      const match = url.match(/\/p\/([^/?]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to get ID from /tv/ format (IGTV)
    if (url.includes('/tv/')) {
      const match = url.match(/\/tv\/([^/?]+)/);
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
    return 'ig_' + Math.abs(hash).toString(16);
  }
}
