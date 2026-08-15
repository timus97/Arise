CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer DEFAULT false NOT NULL,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `username` text,
  `display_username` text
);

CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);

CREATE TABLE `profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `age` integer NOT NULL,
  `sex` text,
  `height_cm` real,
  `weight_kg` real,
  `units` text DEFAULT 'metric' NOT NULL,
  `time_zone` text NOT NULL,
  `level` integer DEFAULT 1 NOT NULL,
  `xp` integer DEFAULT 0 NOT NULL,
  `rank` text DEFAULT 'E' NOT NULL,
  `title` text DEFAULT 'Initiate' NOT NULL,
  `stats_json` text DEFAULT '{"str":10,"agi":10,"vit":10,"intl":10,"sta":10}' NOT NULL,
  `streak_days` integer DEFAULT 0 NOT NULL,
  `best_streak_days` integer DEFAULT 0 NOT NULL,
  `penalty_points_30d` integer DEFAULT 0 NOT NULL,
  `parq_clear` integer DEFAULT 0 NOT NULL,
  `accepted_disclaimer_at` text,
  `health_consent_at` text,
  `onboarding_status` text DEFAULT 'pending' NOT NULL,
  `last_ensured_local_date` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE `goals` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text NOT NULL,
  `target_date` text,
  `target_weight_kg` real,
  `weekly_available_minutes` integer NOT NULL,
  `priority` integer NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE INDEX `goals_user_id_active_idx` ON `goals` (`user_id`, `active`);

CREATE TABLE `habit_profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `experience` integer NOT NULL,
  `equipment_json` text NOT NULL,
  `injuries_json` text NOT NULL,
  `injury_notes` text,
  `job_activity` text NOT NULL,
  `commute_walk_minutes` integer NOT NULL,
  `sleep_start` text NOT NULL,
  `sleep_end` text NOT NULL,
  `diet_preference` text NOT NULL,
  `week_json` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE `plans` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `goal_id` text NOT NULL,
  `version` integer NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `rationale_json` text NOT NULL,
  `archived_at` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade,
  FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE cascade
);

CREATE INDEX `plans_user_id_archived_at_idx` ON `plans` (`user_id`, `archived_at`);

CREATE TABLE `plan_days` (
  `id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL,
  `user_id` text NOT NULL,
  `local_date` text NOT NULL,
  `focus` text NOT NULL,
  `budget_minutes` integer NOT NULL,
  `hard_allowed` integer NOT NULL,
  `is_gate` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `plan_days_plan_id_local_date_uidx` ON `plan_days` (`plan_id`, `local_date`);
CREATE INDEX `plan_days_user_id_local_date_idx` ON `plan_days` (`user_id`, `local_date`);

CREATE TABLE `quest_templates` (
  `id` text PRIMARY KEY NOT NULL
);

CREATE TABLE `daily_quests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `local_date` text NOT NULL,
  `template_id` text NOT NULL,
  `title` text NOT NULL,
  `flavor` text NOT NULL,
  `kind` text NOT NULL,
  `status` text NOT NULL,
  `prescription_json` text NOT NULL,
  `xp_reward` integer NOT NULL,
  `stat_delta_json` text NOT NULL,
  `auto_completable` integer NOT NULL,
  `health_predicate_json` text,
  `source` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `modifiers_applied_json` text DEFAULT '[]' NOT NULL,
  `skip_reason` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `daily_quests_idempotency_key_unique` ON `daily_quests` (`idempotency_key`);
CREATE INDEX `daily_quests_user_id_local_date_idx` ON `daily_quests` (`user_id`, `local_date`);
CREATE INDEX `daily_quests_user_id_status_local_date_idx` ON `daily_quests` (`user_id`, `status`, `local_date`);

CREATE TABLE `quest_completions` (
  `id` text PRIMARY KEY NOT NULL,
  `quest_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text NOT NULL,
  `perceived_rpe` integer,
  `notes` text,
  `client_id` text,
  `completed_at` text NOT NULL,
  FOREIGN KEY (`quest_id`) REFERENCES `daily_quests`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `quest_completions_client_id_unique` ON `quest_completions` (`client_id`);

CREATE TABLE `issuance_ledger` (
  `user_id` text NOT NULL,
  `local_date` text NOT NULL,
  `plan_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`user_id`, `local_date`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE `health_samples` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `source` text NOT NULL,
  `metric` text NOT NULL,
  `value` real NOT NULL,
  `unit` text NOT NULL,
  `start_at` text NOT NULL,
  `end_at` text NOT NULL,
  `dedup_hash` text NOT NULL,
  `ingested_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `health_samples_dedup_hash_unique` ON `health_samples` (`dedup_hash`);
CREATE INDEX `health_samples_user_id_metric_start_at_idx` ON `health_samples` (`user_id`, `metric`, `start_at`);
CREATE INDEX `health_samples_ingested_at_idx` ON `health_samples` (`ingested_at`);

CREATE TABLE `daily_summaries` (
  `user_id` text NOT NULL,
  `local_date` text NOT NULL,
  `steps` integer,
  `active_minutes` integer,
  `sleep_minutes` integer,
  `resting_hr` real,
  `hrv` real,
  `weight_kg` real,
  `soreness` integer,
  `sleep_quality` integer,
  `hard_bouts` integer DEFAULT 0 NOT NULL,
  `recovery_score` real,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`user_id`, `local_date`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE `stat_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `local_date` text NOT NULL,
  `level` integer NOT NULL,
  `xp` integer NOT NULL,
  `rank` text NOT NULL,
  `stats_json` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `stat_snapshots_user_id_local_date_uidx` ON `stat_snapshots` (`user_id`, `local_date`);

CREATE TABLE `xp_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `quest_id` text,
  `delta` integer NOT NULL,
  `reason` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE INDEX `xp_events_user_id_created_at_idx` ON `xp_events` (`user_id`, `created_at`);

CREATE TABLE `rank_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `from_rank` text NOT NULL,
  `to_rank` text NOT NULL,
  `reason` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE TABLE `user_effects` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `kind` text NOT NULL,
  `starts_at` text NOT NULL,
  `ends_at` text NOT NULL,
  `payload_json` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE INDEX `user_effects_user_id_ends_at_idx` ON `user_effects` (`user_id`, `ends_at`);

CREATE TABLE `integrations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `provider` text NOT NULL,
  `status` text NOT NULL,
  `meta_json` text,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `integrations_user_id_provider_uidx` ON `integrations` (`user_id`, `provider`);

CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `actor` text NOT NULL,
  `action` text NOT NULL,
  `meta_json` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null
);

CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);

CREATE TABLE `rate_limits` (
  `key` text NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer NOT NULL,
  PRIMARY KEY (`key`, `window_start`)
);

CREATE TABLE `auth_rl` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL
);
