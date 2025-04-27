// Define constants for audio quality
export const AUDIO_QUALITY_HIGH = 'AUDIO_QUALITY_HIGH';
export const AUDIO_QUALITY_MEDIUM = 'AUDIO_QUALITY_MEDIUM';
export const AUDIO_QUALITY_LOW = 'AUDIO_QUALITY_LOW';

// Interface for youtube-dl response
export interface YoutubeDlResponse {
  formats: {
    height?: number;
    ext?: string;
    acodec?: string;
    url?: string;
    audio_quality?: string;
    abr?: number;
    asr?: number;
  }[];
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
}

// Interface for the extracted format
export interface ExtractedFormat {
  quality: string;
  format: string;
  url: string;
  audioQuality: string;
}

// Interface for the video extraction response
export interface VideoExtractionResponse {
  success: boolean;
  videoId: string;
  title: string;
  channelName: string;
  duration: number;
  thumbnailUrl: string;
  formats: ExtractedFormat[];
  expiresAt: string;
}

// Data transfer object for video extraction request
export class VideoExtractionDto {
  sourceUrl: string;
}
