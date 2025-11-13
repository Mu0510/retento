ALTER TABLE `words` ADD `cachedSentence` text;--> statement-breakpoint
ALTER TABLE `words` ADD `cachedChoice1` varchar(255);--> statement-breakpoint
ALTER TABLE `words` ADD `cachedChoice2` varchar(255);--> statement-breakpoint
ALTER TABLE `words` ADD `cachedChoice3` varchar(255);--> statement-breakpoint
ALTER TABLE `words` ADD `cacheGeneratedAt` timestamp;