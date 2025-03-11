CREATE TABLE IF NOT EXISTS "completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "completions" ADD CONSTRAINT "completions_word_id_french_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."french_words"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
