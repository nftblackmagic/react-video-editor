import {
	pgTable,
	varchar,
	text,
	uuid,
	integer,
	timestamp,
	json,
	index,
	real,
	boolean,
} from "drizzle-orm/pg-core";

// 用户表
export const user = pgTable("User", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.$defaultFn(() => crypto.randomUUID()),
	email: varchar("email", { length: 64 }).notNull().unique(),
	password: varchar("password", { length: 64 }),
	username: varchar("username", { length: 64 }),
	avatar: text("avatar"),
	provider: varchar("provider", { length: 32 }), // github, google, etc
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 项目表 - 视频编辑项目
export const projects = pgTable("Project", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	thumbnail: text("thumbnail"),

	// 项目核心数据
	duration: integer("duration").notNull().default(30000), // 毫秒
	fps: integer("fps").notNull().default(30),
	width: integer("width").notNull().default(1920),
	height: integer("height").notNull().default(1080),

	// 复杂数据以JSON存储
	tracks: json("tracks").$type<any[]>().default([]), // 轨道数据
	trackItems: json("track_items").$type<Record<string, any>>().default({}), // 轨道项目
	transitions: json("transitions").$type<Record<string, any>>().default({}), // 过渡效果
	compositions: json("compositions").$type<any[]>().default([]), // 合成数据
	background: json("background").$type<{ type: string; value: string }>(),
	settings: json("settings"), // 其他项目设置

	status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, published, archived
	isPublic: boolean("is_public").notNull().default(false),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Indexes for projects
export const projectsUserIdIdx = index("projects_user_id_idx").on(
	projects.userId,
);
export const projectsStatusIdx = index("projects_status_idx").on(
	projects.status,
);

// 媒体上传表
export const uploads = pgTable("Upload", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	projectId: uuid("project_id").references(() => projects.id, {
		onDelete: "set null",
	}),

	// 文件信息
	fileName: varchar("file_name", { length: 255 }).notNull(),
	originalName: varchar("original_name", { length: 255 }).notNull(),
	fileUrl: text("file_url").notNull(),
	previewUrl: text("preview_url"),
	fileType: varchar("file_type", { length: 128 }).notNull(), // video/mp4, audio/mp3, image/jpeg
	fileSize: integer("file_size"), // 字节

	// 媒体特定信息
	duration: integer("duration"), // 毫秒，用于音视频
	width: integer("width"), // 像素，用于图片和视频
	height: integer("height"), // 像素，用于图片和视频
	frameRate: real("frame_rate"), // fps，用于视频

	// 服务相关ID
	uploadServiceId: varchar("upload_service_id", { length: 255 }), // 上传服务返回的ID

	// 元数据
	metadata: json("metadata"), // 额外的元数据

	status: varchar("status", { length: 32 }).notNull().default("processing"), // processing, ready, failed
	errorMessage: text("error_message"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Indexes for uploads
export const uploadsUserIdIdx = index("uploads_user_id_idx").on(uploads.userId);
export const uploadsProjectIdIdx = index("uploads_project_id_idx").on(
	uploads.projectId,
);
export const uploadsStatusIdx = index("uploads_status_idx").on(uploads.status);
export const uploadsFileTypeIdx = index("uploads_file_type_idx").on(
	uploads.fileType,
);

// 转录表 - 音视频的字幕/转录
export const transcriptions = pgTable("Transcription", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	uploadId: uuid("upload_id")
		.notNull()
		.references(() => uploads.id, { onDelete: "cascade" }),

	language: varchar("language", { length: 10 }).notNull().default("en"),

	// 转录数据
	segments: json("segments")
		.$type<
			Array<{
				id: string;
				text: string;
				start: number;
				end: number;
				speaker_id?: string;
				confidence?: number;
			}>
		>()
		.notNull(),

	// 转录统计
	wordCount: integer("word_count"),
	duration: integer("duration"), // 总时长（毫秒）

	// 处理状态
	status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, processing, completed, failed
	provider: varchar("provider", { length: 64 }), // elevenlabs, whisper, etc
	errorMessage: text("error_message"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	completedAt: timestamp("completed_at"),
});

// Indexes for transcriptions
export const transcriptionsUploadIdIdx = index(
	"transcriptions_upload_id_idx",
).on(transcriptions.uploadId);
export const transcriptionsStatusIdx = index("transcriptions_status_idx").on(
	transcriptions.status,
);

// 类型导出
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;

export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
