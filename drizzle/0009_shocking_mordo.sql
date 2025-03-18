CREATE TABLE IF NOT EXISTS "word_illustrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"image_path" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "word_illustrations" ADD CONSTRAINT "word_illustrations_word_id_french_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."french_words"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
