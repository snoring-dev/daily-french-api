import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VideoExtractionService } from './video-extraction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VideoExtractionDto } from './video-extraction.types';
import { S3Service } from 'src/file-upload/s3.service';
import * as fs from 'fs';

@Controller('video-extraction')
@UseGuards(JwtAuthGuard)
export class VideoExtractionController {
  constructor(
    private readonly videoExtractionService: VideoExtractionService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  async extractVideo(
    @Body() videoExtractionDto: VideoExtractionDto,
  ): Promise<any> {
    const videoData = await this.videoExtractionService.extractVideo(
      videoExtractionDto.sourceUrl,
    );

    const { downloadedVideoPath } = videoData;

    console.log(`downloaded video as: ${downloadedVideoPath}`);

    const { s3Url: filePath, s3Key } =
      await this.s3Service.uploadVideoFromPath(downloadedVideoPath);

    // delete the downloadedVideo now
    if (downloadedVideoPath && fs.existsSync(downloadedVideoPath)) {
      try {
        fs.unlinkSync(downloadedVideoPath);
        console.log(
          `Successfully deleted temporary video file: ${downloadedVideoPath}`,
        );
      } catch (error) {
        console.error(`Error deleting downloaded video file: ${error.message}`);
      }
    }

    return { ...videoData, videoUrl: filePath, s3Key };
  }

  @Post('presigned-url')
  async getPresignedUrl(
    @Body() body: { s3Key: string },
  ): Promise<{ presignedUrl: string }> {
    const presignedUrl = await this.s3Service.getPresignedUrl(body.s3Key);
    return { presignedUrl };
  }
}
