import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
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
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Extract video information from a Facebook share URL
   * @param sourceUrl Facebook share URL
   * @returns Video data including direct video URL and metadata
   */
  async extractFacebookVideoInfo(
    sourceUrl: string,
  ): Promise<FacebookVideoData> {
    try {
      // 1. First, follow the share URL to get the actual post URL
      const redirectUrl = await this.followRedirect(sourceUrl);

      // 2. Fetch the HTML content from the actual Facebook page
      const html = await this.fetchHtmlContent(redirectUrl);

      // 3. Extract video information from the HTML
      const videoData = this.parseHtmlForVideoInfo(html, redirectUrl);

      if (!videoData.videoUrl) {
        throw new HttpException(
          'Could not extract video URL from the provided Facebook link',
          HttpStatus.NOT_FOUND,
        );
      }

      return videoData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof AxiosError) {
        throw new HttpException(
          `Failed to process Facebook URL: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        'An error occurred while processing the Facebook URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Follow URL redirects to get the final destination URL
   */
  private async followRedirect(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          maxRedirects: 5,
          validateStatus: (status) => status < 400,
          headers: {
            'User-Agent': this.userAgent,
          },
        }),
      );

      return response.request.res.responseUrl || url;
    } catch (error) {
      console.error('Error following redirect:', error.message);
      throw new HttpException(
        'Failed to follow redirect',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Fetch HTML content from a URL
   */
  private async fetchHtmlContent(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml',
          },
        }),
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching HTML content:', error.message);
      throw new HttpException(
        'Failed to fetch content from URL',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Parse HTML to extract video information
   */
  private parseHtmlForVideoInfo(
    html: string,
    pageUrl: string,
  ): FacebookVideoData {
    const $ = cheerio.load(html);
    const result: FacebookVideoData = {
      videoUrl: '',
    };

    // Look for meta tags first (Open Graph data)
    result.title = $('meta[property="og:title"]').attr('content');
    result.description = $('meta[property="og:description"]').attr('content');
    result.thumbnailUrl = $('meta[property="og:image"]').attr('content');

    // Try to extract video URL from various possible sources

    // Method 1: Look for og:video tag
    const ogVideo =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content');

    if (ogVideo) {
      result.videoUrl = ogVideo;
    } else {
      // Method 2: Look for video element
      const videoSrc = $('video').attr('src');
      if (videoSrc) {
        result.videoUrl = videoSrc.startsWith('http')
          ? videoSrc
          : `https://www.facebook.com${videoSrc}`;
      } else {
        // Method 3: Look for embedded video data in script tags
        const scripts = $('script')
          .map((i, el) => $(el).html())
          .get();

        for (const script of scripts) {
          if (!script) continue;

          // Look for patterns like "video_url":"https://..."
          const videoUrlMatch = script.match(
            /"(?:video_url|hd_src|sd_src)":"([^"]+)"/,
          );
          if (videoUrlMatch && videoUrlMatch[1]) {
            result.videoUrl = videoUrlMatch[1].replace(/\\/g, '');
            break;
          }
        }

        // Method 4: If still no video URL found, try to extract from data attributes
        if (!result.videoUrl) {
          const dataStore = $('[data-store]').attr('data-store');
          if (dataStore) {
            try {
              const dataObj = JSON.parse(dataStore);
              if (dataObj.videoURL) {
                result.videoUrl = dataObj.videoURL;
              }
            } catch {
              // Failed to parse data-store JSON, continue
            }
          }
        }
      }
    }

    // Extract author information
    result.author =
      $('meta[property="og:site_name"]').attr('content') ||
      $('.profileLink').first().text() ||
      $('meta[property="author"]').attr('content');

    // Try to extract publish date (this might be challenging and unreliable)
    const timeElement = $('time').first();
    result.publishedDate = timeElement.attr('datetime') || timeElement.text();

    // If we still don't have a video URL but have confirmed it's a video page,
    // fall back to using the page URL with a hash parameter
    if (
      !result.videoUrl &&
      pageUrl.includes('facebook.com') &&
      (html.includes('video_id') || html.includes('VideoPlayer'))
    ) {
      result.videoUrl = `${pageUrl}#t=0`;
    }

    return result;
  }

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
