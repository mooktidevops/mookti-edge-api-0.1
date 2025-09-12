"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.suggestion = exports.document = exports.vote = exports.voteDeprecated = exports.message = exports.messageDeprecated = exports.chat = exports.user = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.user = (0, pg_core_1.pgTable)('User', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 64 }).notNull(),
    password: (0, pg_core_1.varchar)('password', { length: 64 }),
});
exports.chat = (0, pg_core_1.pgTable)('Chat', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    userId: (0, pg_core_1.uuid)('userId')
        .notNull()
        .references(() => exports.user.id),
    visibility: (0, pg_core_1.varchar)('visibility', { enum: ['public', 'private'] })
        .notNull()
        .default('private'),
});
// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
exports.messageDeprecated = (0, pg_core_1.pgTable)('Message', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    chatId: (0, pg_core_1.uuid)('chatId')
        .notNull()
        .references(() => exports.chat.id),
    role: (0, pg_core_1.varchar)('role').notNull(),
    content: (0, pg_core_1.json)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
});
exports.message = (0, pg_core_1.pgTable)('Message_v2', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    chatId: (0, pg_core_1.uuid)('chatId')
        .notNull()
        .references(() => exports.chat.id),
    role: (0, pg_core_1.varchar)('role').notNull(),
    parts: (0, pg_core_1.json)('parts').notNull(),
    attachments: (0, pg_core_1.json)('attachments').notNull(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
});
// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
exports.voteDeprecated = (0, pg_core_1.pgTable)('Vote', {
    chatId: (0, pg_core_1.uuid)('chatId')
        .notNull()
        .references(() => exports.chat.id),
    messageId: (0, pg_core_1.uuid)('messageId')
        .notNull()
        .references(() => exports.messageDeprecated.id),
    isUpvoted: (0, pg_core_1.boolean)('isUpvoted').notNull(),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.chatId, table.messageId] }),
    };
});
exports.vote = (0, pg_core_1.pgTable)('Vote_v2', {
    chatId: (0, pg_core_1.uuid)('chatId')
        .notNull()
        .references(() => exports.chat.id),
    messageId: (0, pg_core_1.uuid)('messageId')
        .notNull()
        .references(() => exports.message.id),
    isUpvoted: (0, pg_core_1.boolean)('isUpvoted').notNull(),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.chatId, table.messageId] }),
    };
});
exports.document = (0, pg_core_1.pgTable)('Document', {
    id: (0, pg_core_1.uuid)('id').notNull().defaultRandom(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    content: (0, pg_core_1.text)('content'),
    kind: (0, pg_core_1.varchar)('text', { enum: ['text', 'code', 'image', 'sheet'] })
        .notNull()
        .default('text'),
    userId: (0, pg_core_1.uuid)('userId')
        .notNull()
        .references(() => exports.user.id),
}, (table) => {
    return {
        pk: (0, pg_core_1.primaryKey)({ columns: [table.id, table.createdAt] }),
    };
});
exports.suggestion = (0, pg_core_1.pgTable)('Suggestion', {
    id: (0, pg_core_1.uuid)('id').notNull().defaultRandom(),
    documentId: (0, pg_core_1.uuid)('documentId').notNull(),
    documentCreatedAt: (0, pg_core_1.timestamp)('documentCreatedAt').notNull(),
    originalText: (0, pg_core_1.text)('originalText').notNull(),
    suggestedText: (0, pg_core_1.text)('suggestedText').notNull(),
    description: (0, pg_core_1.text)('description'),
    isResolved: (0, pg_core_1.boolean)('isResolved').notNull().default(false),
    userId: (0, pg_core_1.uuid)('userId')
        .notNull()
        .references(() => exports.user.id),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.id] }),
    documentRef: (0, pg_core_1.foreignKey)({
        columns: [table.documentId, table.documentCreatedAt],
        foreignColumns: [exports.document.id, exports.document.createdAt],
    }),
}));
exports.stream = (0, pg_core_1.pgTable)('Stream', {
    id: (0, pg_core_1.uuid)('id').notNull().defaultRandom(),
    chatId: (0, pg_core_1.uuid)('chatId').notNull(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').notNull(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.id] }),
    chatRef: (0, pg_core_1.foreignKey)({
        columns: [table.chatId],
        foreignColumns: [exports.chat.id],
    }),
}));
