import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	password: text('password').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: text('expires_at').notNull()
});

export const items = sqliteTable('items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	type: text('type', { enum: ['bookmark', 'note', 'snippet'] }).notNull(),
	title: text('title'),
	body: text('body'),
	url: text('url'),
	language: text('language'),
	pinned: integer('pinned').notNull().default(0),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	archivedAt: text('archived_at')
});

export const tags = sqliteTable('tags', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const itemTags = sqliteTable(
	'item_tags',
	{
		itemId: integer('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => ({
		pk: primaryKey({ columns: [t.itemId, t.tagId] })
	})
);

export const spends = sqliteTable('spends', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	amount: integer('amount').notNull(),
	currency: text('currency').notNull().default('IDR'),
	category: text('category'),
	merchant: text('merchant'),
	note: text('note'),
	method: text('method'),
	refId: text('ref_id'),
	occurredAt: text('occurred_at').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const receipts = sqliteTable('receipts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	spendId: integer('spend_id').references(() => spends.id, { onDelete: 'set null' }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	imagePath: text('image_path'),
	mime: text('mime'),
	ocrText: text('ocr_text'),
	extractedJson: text('extracted_json'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const bills = sqliteTable('bills', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	amount: integer('amount').notNull(),
	category: text('category', {
		enum: ['listrik', 'internet', 'cicilan', 'langganan', 'kartu_kredit', 'lainnya']
	})
		.notNull()
		.default('lainnya'),
	recurrence: text('recurrence', { enum: ['none', 'monthly', 'weekly', 'custom_days'] })
		.notNull()
		.default('monthly'),
	intervalDays: integer('interval_days'),
	nextDueAt: text('next_due_at').notNull(),
	windowNotifiedAt: text('window_notified_at'),
	dueDayNotifiedAt: text('due_day_notified_at'),
	snoozedUntil: text('snoozed_until'),
	paidAt: text('paid_at'),
	archivedAt: text('archived_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	deviceLabel: text('device_label'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Spend = typeof spends.$inferSelect;
export type NewSpend = typeof spends.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
