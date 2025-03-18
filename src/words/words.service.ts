import { Inject, Injectable } from '@nestjs/common';
import {
  eq,
  sql,
  and,
  isNotNull,
  ne,
  or,
  isNull,
  notInArray,
  inArray,
  desc,
} from 'drizzle-orm';
import {
  definitions,
  frenchWords,
  completions,
  history,
  wordIllustrations,
} from '../db/schema';
import { DeepseekService } from './deepseek.service';
import { getRankingsUpTo, Ranking } from 'src/utils/word_ranking';

@Injectable()
export class WordsService {
  constructor(
    @Inject('DATABASE') private db: any,
    private deepseekService: DeepseekService,
  ) {}

  async getRandomWordsWithDefinitions(
    count: number = 1,
    userId: number,
    level: Ranking,
  ) {
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
      .where(
        notInArray(
          frenchWords.id,
          this.db
            .select({ wordId: history.wordId })
            .from(history)
            .where(eq(history.userId, userId)),
        ),
        isNotNull(frenchWords.ranking),
        inArray(frenchWords.ranking, getRankingsUpTo(level)),
      )
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
            level as Ranking,
          );

          // Parse the enrichment string to JSON
          const enrichment = JSON.parse(enrichmentStr);

          // Store the enrichment in the completions table
          await this.db.insert(completions).values({
            wordId: word.id,
            content: enrichment,
          });

          return {
            id: word.id,
            userId,
            word: word.word,
            definitions: word.definitions || [],
            completions: enrichment,
          };
        }

        return {
          id: word.id,
          userId,
          word: word.word,
          definitions: word.definitions || [],
          completions: filteredCompletions[0],
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
      .where(or(isNull(frenchWords.ranking), eq(frenchWords.ranking, '')))
      .orderBy(frenchWords.id)
      .offset(offset)
      .limit(pageSize);

    const pageData = words.map((word) => ({ id: word.id, word: word.word }));
    return pageData;
  }

  async getUserHistory(userId: number) {
    const userHistory = await this.db
      .select({
        word: frenchWords.word,
        definitions: sql<
          string[]
        >`array_agg(DISTINCT ${definitions.definition})`,
        completions: sql<any[]>`array_agg(DISTINCT ${completions.content})`,
        seenAt: history.createdAt,
      })
      .from(history)
      .innerJoin(frenchWords, eq(history.wordId, frenchWords.id))
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .leftJoin(completions, eq(frenchWords.id, completions.wordId))
      .where(eq(history.userId, userId))
      .groupBy(frenchWords.word, history.createdAt)
      .orderBy(desc(history.createdAt));

    return userHistory.map((entry) => ({
      word: entry.word,
      definitions: entry.definitions.filter((d) => d !== null) || [],
      completions: entry.completions.filter((c) => c !== null)[0] || null,
      seenAt: entry.seenAt,
    }));
  }

  async addWordsToHistory(words: any[]) {
    const historyRecords = words.map(({ id, userId }) => ({
      userId,
      wordId: id,
    }));

    await this.db.insert(history).values(historyRecords);
  }

  async getWordsWithRanking(step: number = 0) {
    const pageSize = 2000;
    const offset = step * pageSize;

    const words = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        ranking: frenchWords.ranking,
        definitions: sql<
          string[]
        >`array_agg(DISTINCT ${definitions.definition})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .where(and(isNotNull(frenchWords.ranking), ne(frenchWords.ranking, '')))
      .groupBy(frenchWords.id, frenchWords.word, frenchWords.ranking)
      .orderBy(frenchWords.ranking)
      .offset(offset)
      .limit(pageSize);

    return words.map((word) => ({
      word: word.word,
      ranking: word.ranking,
      definitions: word.definitions || [],
    }));
  }

  async getWordsWithoutRanking(step: number = 0) {
    const pageSize = 2000;
    const offset = step * pageSize;
    const words = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        definitions: sql<
          string[]
        >`array_agg(DISTINCT ${definitions.definition})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .where(or(isNull(frenchWords.ranking), eq(frenchWords.ranking, '')))
      .groupBy(frenchWords.id, frenchWords.word)
      .orderBy(frenchWords.word)
      .offset(offset)
      .limit(pageSize);

    return words.map((word) => ({
      word: word.word,
      definitions: word.definitions || [],
    }));
  }

  async getWordById(wordId: number) {
    const word = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        definitions: sql<
          string[]
        >`array_remove(array_agg(DISTINCT ${definitions.definition}), null)`,
        completions: sql<
          any[]
        >`array_remove(array_agg(DISTINCT ${completions.content}), null)`,
        illustrations: sql<
          string[]
        >`array_remove(array_agg(DISTINCT ${wordIllustrations.imagePath}), null)`,
      })
      .from(frenchWords)
      .where(eq(frenchWords.id, wordId))
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .leftJoin(completions, eq(frenchWords.id, completions.wordId))
      .leftJoin(wordIllustrations, eq(frenchWords.id, wordIllustrations.wordId))
      .groupBy(frenchWords.id, frenchWords.word)
      .limit(1);

    if (word.length === 0) {
      return null;
    }

    return {
      id: word[0].id,
      word: word[0].word,
      definitions: word[0].definitions.filter((d) => d !== null) || [],
      completions: word[0].completions.filter((c) => c !== null)[0] || null,
      illustrations: word[0].illustrations || [],
    };
  }

  async saveWordIllustration(wordId: number, imageUrl: string) {
    try {
      // Insert into word_illustrations table
      const newIllustration = await this.db
        .insert(wordIllustrations)
        .values({
          wordId: wordId,
          imagePath: imageUrl,
        })
        .returning();

      return newIllustration[0];
    } catch (error) {
      console.error('Failed to save word illustration:', error);
      throw new Error('Failed to save word illustration');
    }
  }
}
