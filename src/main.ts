/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { definitions, frenchWords } from './db/schema';
import { db } from './db/db';
import { parseDefinitions } from './utils/parse-definitions.util';
import { determineCEFRLevel, Ranking } from './utils/work_ranking';
import { WordsService } from './words/words.service';
import { eq, sql } from 'drizzle-orm';
import type { InferModel } from 'drizzle-orm';

type FrenchWord = InferModel<typeof frenchWords>;
type FrenchWordUpdate = Partial<FrenchWord>;

async function importWords(): Promise<void> {
  console.log('Starting CSV import...');
  let importedWordsCount = 0;
  let failedImportsCount = 0;
  const parser = parse({ columns: true, delimiter: ',' });
  const readStream = createReadStream('src/assets/french_dico.csv');

  readStream.pipe(parser);

  for await (const record of parser) {
    const word = record['Mot'];
    const definitionsArray = parseDefinitions(record['Définitions']);

    try {
      // Insert word
      const [insertedWord] = await db
        .insert(frenchWords)
        .values({ word })
        .returning({ id: frenchWords.id });

      // Insert definitions
      for (const definition of definitionsArray) {
        await db
          .insert(definitions)
          .values({ wordId: insertedWord.id, definition });
      }

      importedWordsCount += 1;
    } catch (error) {
      console.error(`Error importing word ${word}:`, error.message);
      failedImportsCount += 1;
    }
  }

  console.log(
    `CSV import completed [Imported: ${importedWordsCount}, Failed: ${failedImportsCount}]`,
  );
}

async function calculateWordsRanking() {
  console.log('Starting CEFR ranking calculation...');
  const app = await NestFactory.create(AppModule);
  const wordsService = app.get(WordsService);
  
  let step = 0;
  let totalProcessed = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Processing batch ${step + 1}...`);
    const words = await wordsService.getPaginatedWords(step);
    
    if (words.length === 0) {
      hasMore = false;
      break;
    }

    // Process words in smaller chunks to avoid overwhelming the database
    const chunkSize = 1000;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize);
      
      // Process each word in the chunk
      for (const word of chunk) {
        const ranking = determineCEFRLevel(word.word);
        await db.execute(
          sql`UPDATE french_words SET ranking = ${ranking}, updated_at = NOW() WHERE id = ${word.id}`
        );
      }

      totalProcessed += chunk.length;
      console.log(`Processed ${totalProcessed} words so far...`);
    }

    step++;
  }

  console.log(`Completed CEFR ranking calculation. Total words processed: ${totalProcessed}`);
  await app.close();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}

bootstrap();
