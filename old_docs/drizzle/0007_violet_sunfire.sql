CREATE TABLE `pre_generated_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionsData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	CONSTRAINT `pre_generated_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `pre_generated_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `used_at_idx` ON `pre_generated_sessions` (`usedAt`);