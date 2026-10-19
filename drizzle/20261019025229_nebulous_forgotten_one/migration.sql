CREATE TABLE `auth_audit_logs` (
	`id` varchar(36) PRIMARY KEY,
	`event` varchar(100) NOT NULL,
	`user_id` varchar(36),
	`ip_address` text,
	`user_agent` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
