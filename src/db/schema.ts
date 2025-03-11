import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name').default(''),
  lastName: varchar('last_name').default(''),
  pictureUrl: varchar('picture_url').default(''),
  phoneNumber: varchar('phone_number').notNull().unique(),
  email: varchar('email').notNull().unique(),
  emailConfirmation: boolean('email_confirmation').notNull().default(false),
  hashedPassword: text('hashed_password').notNull(),
  verificationToken: varchar('verification_token').unique(),
  resetCode: varchar('reset_code', { length: 8 }),
  resetCodeExpires: timestamp('reset_code_expires'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 255 }),
  zipCode: varchar('zip_code', { length: 20 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const frenchWords = pgTable('french_words', {
  id: serial('id').primaryKey(),
  word: varchar('word').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const definitions = pgTable('definitions', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id')
    .references(() => frenchWords.id)
    .notNull(),
  definition: text('definition').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const completions = pgTable('completions', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id')
    .references(() => frenchWords.id)
    .notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  address: one(addresses, {
    fields: [users.id],
    references: [addresses.userId],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const frenchWordsRelations = relations(frenchWords, ({ many }) => ({
  definitions: many(definitions),
  completions: many(completions),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  word: one(frenchWords, {
    fields: [completions.wordId],
    references: [frenchWords.id],
  }),
}));
