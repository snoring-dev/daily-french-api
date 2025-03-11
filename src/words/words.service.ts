import { Inject, Injectable } from '@nestjs/common';
import { eq, sql, and, isNotNull, ne, or, isNull } from 'drizzle-orm';
import { definitions, frenchWords, completions } from '../db/schema';
import { DeepseekService } from './deepseek.service';

@Injectable()
export class WordsService {
  constructor(
    @Inject('DATABASE') private db: any,
    private deepseekService: DeepseekService,
  ) {}

  async getRandomWordsWithDefinitions(count: number = 1) {
    const randomWords = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        definitions: sql<
          string[]
        >`array_agg(DISTINCT ${definitions.definition})`,
        completions: sql<any[]>`array_agg(DISTINCT ${completions.content})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .leftJoin(completions, eq(frenchWords.id, completions.wordId))
      .groupBy(frenchWords.id, frenchWords.word)
      .orderBy(sql`RANDOM()`)
      .limit(count);

    const enrichedWords = await Promise.all(
      randomWords.map(async (word) => {
        const filteredCompletions =
          word.completions.filter((c) => c !== null) || [];

        if (filteredCompletions.length <= 0) {
          const enrichmentStr = await this.deepseekService.getWordEnrichment(
            word.word,
          );

          // Parse the enrichment string to JSON
          const enrichment = JSON.parse(enrichmentStr);

          // Store the enrichment in the completions table
          await this.db.insert(completions).values({
            wordId: word.id,
            content: enrichment, // Store as parsed JSON
          });

          return {
            word: word.word,
            definitions: word.definitions || [],
            completions: enrichment,
          };
        }

        return {
          word: word.word,
          definitions: word.definitions || [],
          completions: filteredCompletions[0], // Take the first completion since they're all the same
        };
      }),
    );

    return enrichedWords;
  }

  async getPaginatedWords(step: number = 0) {
    const pageSize = 10000;
    const offset = step * pageSize;

    const words = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
      })
      .from(frenchWords)
      .where(
        or(
          isNull(frenchWords.ranking),
          eq(frenchWords.ranking, '')
        )
      )
      .orderBy(frenchWords.id)
      .offset(offset)
      .limit(pageSize);

    // Convert to CSV format with explicit line breaks
    const pageData = words.map((word) => ({ id: word.id, word: word.word }));
    return pageData;
  }

  async getWordsWithRanking() {
    const words = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        ranking: frenchWords.ranking,
        definitions: sql<string[]>`array_agg(DISTINCT ${definitions.definition})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .where(
        and(
          isNotNull(frenchWords.ranking),
          ne(frenchWords.ranking, '')
        )
      )
      .groupBy(frenchWords.id, frenchWords.word, frenchWords.ranking)
      .orderBy(frenchWords.ranking);

    return words.map(word => ({
      word: word.word,
      ranking: word.ranking,
      definitions: word.definitions || []
    }));
  }

  async getWordsWithoutRanking() {
    const words = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        definitions: sql<string[]>`array_agg(DISTINCT ${definitions.definition})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .where(
        or(
          isNull(frenchWords.ranking),
          eq(frenchWords.ranking, '')
        )
      )
      .groupBy(frenchWords.id, frenchWords.word)
      .orderBy(frenchWords.word);

    return words.map(word => ({
      word: word.word,
      definitions: word.definitions || []
    }));
  }
}
