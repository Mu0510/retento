CREATE TABLE `initial_test_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wordId` int NOT NULL,
	`difficultyScore` int NOT NULL,
	`sentenceContext` text NOT NULL,
	`sentenceJapanese` text NOT NULL,
	`correctAnswer` varchar(255) NOT NULL,
	`choice1` varchar(255) NOT NULL,
	`choice2` varchar(255) NOT NULL,
	`choice3` varchar(255) NOT NULL,
	`choice4` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `initial_test_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_initial_test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`initialScore` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`testDetails` text NOT NULL,
	CONSTRAINT `user_initial_test_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_initial_test_results_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `difficulty_score_idx` ON `initial_test_questions` (`difficultyScore`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_initial_test_results` (`userId`);