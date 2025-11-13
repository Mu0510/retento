CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('school','class','custom') NOT NULL,
	`inviteCode` varchar(20),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`wordId` int NOT NULL,
	`sentenceContext` text NOT NULL,
	`correctAnswer` varchar(255) NOT NULL,
	`choice1` varchar(255) NOT NULL,
	`choice2` varchar(255) NOT NULL,
	`choice3` varchar(255) NOT NULL,
	`choice4` varchar(255) NOT NULL,
	`userAnswer` varchar(255),
	`isCorrect` boolean,
	`confidenceLevel` enum('perfect','again','not_confident'),
	`answerTimeMs` int,
	`aiFeedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rankingType` enum('weekly','all_time') NOT NULL,
	`score` int NOT NULL,
	`rank` int NOT NULL,
	`percentile` float,
	`scope` enum('national','school','group') NOT NULL,
	`scopeId` int,
	`snapshotDate` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` varchar(255),
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`totalQuestions` int NOT NULL DEFAULT 10,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`aiFeedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `theme_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`themeDescription` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`sessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `theme_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_word_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wordId` int NOT NULL,
	`timesAnswered` int NOT NULL DEFAULT 0,
	`timesCorrect` int NOT NULL DEFAULT 0,
	`timesIncorrect` int NOT NULL DEFAULT 0,
	`nextReviewAt` timestamp,
	`lastAnsweredAt` timestamp,
	`confidenceLevel` enum('perfect','again','not_confident'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_word_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `words` (
	`id` int AUTO_INCREMENT NOT NULL,
	`word` varchar(100) NOT NULL,
	`partOfSpeech` varchar(50) NOT NULL,
	`difficultyScore` int NOT NULL,
	`commonMeaning1` varchar(255) NOT NULL,
	`commonMeaning2` varchar(255),
	`commonMeaning3` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `words_id` PRIMARY KEY(`id`),
	CONSTRAINT `words_word_unique` UNIQUE(`word`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `currentRank` varchar(10) DEFAULT 'D';--> statement-breakpoint
ALTER TABLE `users` ADD `totalScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rankingOptIn` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `schoolName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `groupId` int;--> statement-breakpoint
CREATE INDEX `session_id_idx` ON `questions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `word_id_idx` ON `questions` (`wordId`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `rankings` (`userId`);--> statement-breakpoint
CREATE INDEX `ranking_type_idx` ON `rankings` (`rankingType`);--> statement-breakpoint
CREATE INDEX `scope_idx` ON `rankings` (`scope`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `theme_requests` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `theme_requests` (`status`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_word_progress` (`userId`);--> statement-breakpoint
CREATE INDEX `word_id_idx` ON `user_word_progress` (`wordId`);--> statement-breakpoint
CREATE INDEX `next_review_at_idx` ON `user_word_progress` (`nextReviewAt`);