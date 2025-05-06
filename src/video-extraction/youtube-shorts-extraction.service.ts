import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

export interface YoutubeShortData {
  videoUrl: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
  publishedDate?: string;
  viewCount?: string;
}

@Injectable()
export class YoutubeShortExtractionService {
  private readonly logger = new Logger(YoutubeShortExtractionService.name);

  constructor() {}

  async extractYoutubeShort(url: string): Promise<any> {
    // Validate it's actually a Short
    if (!this.isYoutubeShort(url)) {
      throw new Error('URL is not a YouTube Short');
    }

    try {
      return await this.extractWithYtDlp(url);
    } catch (error) {
      this.logger.warn(
        `YouTube Short yt-dlp extraction failed: ${error.message}`,
      );
      throw new Error(`YouTube Short extraction failed: ${error.message}`);
    }
  }

  private isYoutubeShort(url: string): boolean {
    return url.includes('/shorts/');
  }

  private async extractWithYtDlp(url: string): Promise<any> {
    try {
      // Clean and normalize the URL
      const cleanUrl = this.normalizeYoutubeUrl(url);
      const videoId = this.extractVideoId(cleanUrl);

      // Enhanced options for more reliable extraction
      const baseArgs = '--no-check-certificates --no-warnings --no-progress';

      // Mobile user-agent to bypass restrictions (removed cookies dependency)
      const mobileArgs =
        '--user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"';

      // YouTube Shorts specific settings
      const shortsArgs = '--extractor-args "youtube:player_client=android,ios"';

      // Don't limit format selection - get all available formats
      const formatArgs = '-f "bestvideo+bestaudio/best"';

      // Request complete information
      const outputArgs = '--print-json';

      // More aggressive options for better extraction
      const advancedArgs =
        '--no-check-formats --ignore-no-formats-error --extractor-retries 3';

      // Use a reliable filename pattern
      const timestamp = Date.now();
      const fileArgs = `--no-part --output "public/videos/yt_short_${videoId}_${timestamp}.mp4"`;

      // Combine all arguments (removed cookieArgs)
      const fullCommand = `yt-dlp ${baseArgs} ${mobileArgs} ${shortsArgs} ${formatArgs} ${outputArgs} ${advancedArgs} ${fileArgs} "${cleanUrl}"`;

      // Execute with timeout for safety
      const { stdout } = await execAsync(fullCommand, { timeout: 45000 });

      // Parse the JSON response
      const fullData = JSON.parse(stdout);

      const downloadedVideoPath = `public/videos/yt_short_${videoId}_${timestamp}.mp4`;

      // Ensure the directory exists
      await this.ensureDirectoryExists(path.dirname(downloadedVideoPath));

      // Extract video info with all quality options
      return {
        id: fullData.id || videoId,
        title: fullData.title || 'YouTube Short',
        defaultUrl: this.getBestVideoUrl(fullData),
        thumbnail: fullData.thumbnail,
        duration: fullData.duration,
        formats: this.categorizeFormats(fullData.formats),
        author: fullData.uploader || fullData.channel || '',
        downloadedVideoPath,
      };
    } catch (error) {
      this.logger.error(
        `YouTube Short yt-dlp extraction failed: ${error.message}`,
      );
      throw new Error(`YouTube Short extraction failed: ${error.message}`);
    }
  }

  // Normalize YouTube URL
  private normalizeYoutubeUrl(url: string): string {
    // For shorts, convert mobile links to standard format
    if (url.includes('youtube.com/shorts/')) {
      const videoId = this.extractVideoId(url);
      return `https://www.youtube.com/shorts/${videoId}`;
    }

    // Convert youtu.be links to full YouTube URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    return url;
  }

  // Get the best default video URL for immediate playback
  private getBestVideoUrl(data: any): string {
    if (!data || !data.formats || !Array.isArray(data.formats)) {
      return null;
    }

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
    if (!formats || !Array.isArray(formats) || formats.length === 0) {
      this.logger.warn('No valid formats found for categorization');
      return {
        high: [],
        medium: [],
        low: [],
        default: null,
      };
    }

    // Filter playable formats (with both audio and video)
    const playableFormats = formats.filter(
      (format) =>
        format.vcodec !== 'none' &&
        format.acodec !== 'none' &&
        !format.format_note?.includes('storyboard'),
    );

    if (playableFormats.length === 0) {
      this.logger.warn('No playable formats found with both audio and video');
      return {
        high: [],
        medium: [],
        low: [],
        default: null,
      };
    }

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
    if (!format) return null;

    return {
      format_id: format.format_id || 'unknown',
      quality: format.height ? `${format.height}p` : 'unknown',
      url: format.url || null,
      resolution:
        format.width && format.height
          ? `${format.width}x${format.height}`
          : 'unknown',
      filesize: format.filesize || format.filesize_approx || 0,
      tbr: format.tbr || 0,
      fps: format.fps || 30,
    };
  }

  // Select best default format (balancing quality vs size)
  private selectDefaultFormat(formats: any[]): any {
    if (!formats || formats.length === 0) return null;

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
    // Extract YouTube video ID from URL
    let videoId = '';

    if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1].split(/[?&]/)[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }

    if (!videoId) {
      // Fallback to hash if we can't extract the ID
      return this.generateHashFromUrl(url);
    }

    return videoId;
  }

  private generateHashFromUrl(url: string): string {
    // Create a simple hash from the URL if we can't extract ID
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'yt_' + Math.abs(hash).toString(16);
  }

  // Helper method to ensure directory exists
  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await mkdirAsync(directory, { recursive: true });
    } catch (error) {
      // If error is not 'directory already exists', rethrow it
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
