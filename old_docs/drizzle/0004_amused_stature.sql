ALTER TABLE `questions` ADD `feedbackCorrect` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `feedbackChoice1` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `feedbackChoice2` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `feedbackChoice3` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `feedbackChoice4` text;--> statement-breakpoint
ALTER TABLE `questions` DROP COLUMN `aiFeedback`;