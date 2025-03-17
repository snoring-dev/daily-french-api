import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fal } from '@fal-ai/client';

@Injectable()
export class ImageGeneratorService {
  constructor(private configService: ConfigService) {
    fal.config({
      credentials: this.configService.get<string>('FAL_KEY'),
    });
  }

  async generateImage(prompt: string): Promise<any> {
    try {
      const result = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: prompt,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      return {
        imageData: result.data,
        requestId: result.requestId,
      };
    } catch (error) {
      console.error(`Error generating image with prompt "${prompt}":`, error);
      return null;
    }
  }
}
