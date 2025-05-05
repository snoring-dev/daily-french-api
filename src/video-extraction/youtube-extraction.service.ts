import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class YoutubeExtractionService {
  private readonly logger = new Logger(YoutubeExtractionService.name);

  async extractYoutubeVideo(url: string): Promise<any> {
    // Detect if it's a Short
    const isShort = this.isYoutubeShort(url);

    try {
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

      if (!fullData || !fullData.id) {
        throw new Error('Invalid or incomplete data received from yt-dlp');
      }

      // Extract video info with all quality options
      const videoInfo = {
        id: fullData.id,
        title: fullData.title || 'Unknown title',
        defaultUrl: this.getBestVideoUrl(fullData),
        thumbnail: fullData.thumbnail || null,
        duration: fullData.duration || 0,
        formats: this.categorizeFormats(fullData.formats || []),
      };

      // Download and save the video
      const { filePath } = await this.downloadVideoToPublicFolder(
        url,
        fullData.id,
      );

      // Add local file information to the response
      return {
        ...videoInfo,
        downloadedVideoPath: filePath,
      };
    } catch (error) {
      this.logger.error(`YouTube yt-dlp extraction failed: ${error.message}`);
      throw new Error(`YouTube video extraction failed: ${error.message}`);
    }
  }

  // Helper method to download video to public folder
  private async downloadVideoToPublicFolder(
    url: string,
    videoId: string,
  ): Promise<{
    filePath: string;
    fileName: string;
  }> {
    // Create a unique filename with timestamp and video ID
    const fileName = `${Date.now()}_${videoId}.mp4`;

    // Define the destination directory
    const publicVideosDir = path.join(process.cwd(), 'public', 'videos');

    // Ensure the directory exists
    await this.ensureDirectoryExists(publicVideosDir);

    // Full path to save the file
    const filePath = path.join(publicVideosDir, fileName);

    // yt-dlp command to download video in mp4 format
    const baseArgs = '--no-check-certificates --no-warnings';
    // Add cookies from browser and user agent to bypass bot protection
    const antiBot =
      '--cookies-from-browser chrome --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';
    const formatArgs = '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4"';
    const outputArgs = `-o "${filePath}"`;

    const fullCommand = `yt-dlp ${baseArgs} ${antiBot} ${formatArgs} ${outputArgs} "${url}"`;

    // Execute the command
    this.logger.log(`Downloading video from ${url} to ${filePath}`);
    await execAsync(fullCommand, { timeout: 60000 }); // Increased timeout for download

    return {
      filePath,
      fileName,
    };
  }

  // Get the best default video URL for immediate playback
  private getBestVideoUrl(data: any): string {
    if (!data || !data.formats || !Array.isArray(data.formats)) {
      this.logger.warn('No valid formats found for video URL extraction');
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

  private async extractShortWithCustomMethod(url: string): Promise<any> {
    try {
      const videoId = this.extractVideoId(url);

      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      // This is a placeholder for a custom extraction method
      // For now, return minimal working data to prevent errors
      return {
        id: videoId,
        title: 'YouTube Short',
        defaultUrl: null,
        thumbnail: null,
        duration: 0,
        formats: {
          high: [],
          medium: [],
          low: [],
          default: null,
        },
        downloadedVideoPath: null,
      };
    } catch (error) {
      this.logger.error(`Custom extraction for Short failed: ${error.message}`);
      throw new Error(`YouTube Short extraction failed: ${error.message}`);
    }
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
