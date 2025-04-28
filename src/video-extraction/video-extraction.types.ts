// Define constants for audio quality
export const AUDIO_QUALITY_HIGH = 'AUDIO_QUALITY_HIGH';
export const AUDIO_QUALITY_MEDIUM = 'AUDIO_QUALITY_MEDIUM';
export const AUDIO_QUALITY_LOW = 'AUDIO_QUALITY_LOW';

export class VideoExtractionDto {
  sourceUrl: string;
}

export interface VideoDTO {
  videoUrl: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
}
