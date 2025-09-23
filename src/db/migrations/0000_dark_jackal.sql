CREATE TABLE "Project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"thumbnail" text,
	"duration" integer DEFAULT 30000 NOT NULL,
	"fps" integer DEFAULT 30 NOT NULL,
	"width" integer DEFAULT 1920 NOT NULL,
	"height" integer DEFAULT 1080 NOT NULL,
	"tracks" jsonb,
	"track_items" jsonb,
	"transitions" jsonb,
	"compositions" jsonb,
	"background" jsonb,
	"settings" jsonb,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Transcription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"segments" jsonb NOT NULL,
	"word_count" integer,
	"duration" integer,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"provider" varchar(64),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "Upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"preview_url" text,
	"file_type" varchar(128) NOT NULL,
	"file_size" integer,
	"duration" integer,
	"width" integer,
	"height" integer,
	"frame_rate" real,
	"upload_service_id" varchar(255),
	"metadata" jsonb,
	"status" varchar(32) DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64),
	"username" varchar(64),
	"avatar" text,
	"provider" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_upload_id_Upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."Upload"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_project_id_Project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;