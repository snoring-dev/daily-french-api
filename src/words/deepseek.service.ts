import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { promptMessage } from '../utils/prompt';
import { Ranking } from 'src/utils/word_ranking';

@Injectable()
export class DeepseekService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: this.configService.get<string>('DEEPSEEK_BASE_URL'),
      apiKey: this.configService.get<string>('DEEPSEEK_API_KEY'),
    });
  }

  async getWordEnrichment(word: string, level: Ranking): Promise<any> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful French language assistant.',
          },
          { role: 'user', content: promptMessage(word, level) },
        ],
        model: 'deepseek-chat',
      });

      const content = completion.choices[0].message.content;
      const jsonContent = content.replace(/```json\n|\n```/g, '');
      return jsonContent;
    } catch (error) {
      console.error(`Error getting enrichment for word ${word}:`, error);
      return null;
    }
  }
}
