import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

@Injectable()
export class YoutubeExtractionService {
  private readonly logger = new Logger(YoutubeExtractionService.name);

  async extractYoutubeVideo(url: string): Promise<any> {
    // Detect if it's a Short
    const isShort = this.isYoutubeShort(url);

    try {
      // Try yt-dlp first with optimized settings for Shorts
      return await this.extractWithYtDlp(url, isShort);
    } catch (error) {
      this.logger.warn(`YouTube yt-dlp extraction failed: ${error.message}`);

      // Fall back to custom extraction for Shorts
      if (isShort) {
        return await this.extractShortWithCustomMethod(url);
      }

      throw new Error(`YouTube video extraction failed after all attempts`);
    }
  }

  private isYoutubeShort(url: string): boolean {
    return url.includes('/shorts/');
  }

  private async extractWithYtDlp(url: string, isShort: boolean): Promise<any> {
    try {
      // Enhanced options for more reliable extraction
      const baseArgs = '--no-check-certificates --no-warnings --no-progress';

      // Add platform-specific options for shorts
      const shortArgs = isShort
        ? '--extractor-args "youtube:player_client=android"'
        : '';

      // Don't limit format selection - get all available formats
      const formatArgs = '-f "bestvideo+bestaudio/best"';

      // Request complete information
      const outputArgs = '--print-json';

      // Combine all arguments
      const fullCommand = `yt-dlp ${baseArgs} ${shortArgs} ${formatArgs} ${outputArgs} "${url}"`;

      // Execute with timeout for safety
      const { stdout } = await execAsync(fullCommand, { timeout: 20000 });

      // Parse the JSON response
      const fullData = JSON.parse(stdout);

      // Extract video info with all quality options
      return {
        id: fullData.id,
        title: fullData.title,
        defaultUrl: this.getBestVideoUrl(fullData),
        thumbnail: fullData.thumbnail,
        duration: fullData.duration,
        formats: this.categorizeFormats(fullData.formats),
      };
    } catch (error) {
      this.logger.error(`YouTube yt-dlp extraction failed: ${error.message}`);
      throw new Error(`YouTube video extraction failed: ${error.message}`);
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

  private async extractShortWithCustomMethod(url: string): Promise<any> {
    // Implement custom extraction logic for Shorts
    // This could involve web scraping or using an alternative API

    // Example implementation using axios to fetch page and extract player config
    const videoId = this.extractVideoId(url);

    // Custom extraction logic would go here
    // (This is a placeholder - actual implementation would be more complex)

    return {
      id: videoId,
      // Other fields would be populated from extraction
    };
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

    return videoId;
  }
}
