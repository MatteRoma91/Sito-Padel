import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';

process.env.DATABASE_PATH = path.join(process.cwd(), 'data', 'test-chat.db');

const testDir = path.dirname(process.env.DATABASE_PATH!);
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

let testUserIds: string[] = [];

beforeAll(async () => {
  const { ensureDb, getUsers, createUser } = await import('@/lib/db/queries');
  ensureDb();
  let users = getUsers();
  for (let i = users.length; i < 3; i++) {
    createUser({
      username: `testuser${Date.now()}_${i}`,
      password: 'Test123',
      full_name: 'Test User',
      role: 'player',
      mustChangePassword: false,
    });
    users = getUsers();
  }
  testUserIds = getUsers().slice(0, 3).map(u => u.id);
});

afterAll(() => {
  try {
    if (process.env.DATABASE_PATH && fs.existsSync(process.env.DATABASE_PATH)) {
      fs.unlinkSync(process.env.DATABASE_PATH);
    }
  } catch {
    // ignore
  }
});

describe('chat-queries insertMessage', () => {
  it('rejects empty body', async () => {
    const { getOrCreateDmConversation, insertMessage } = await import('@/lib/db/chat-queries');
    const [u1, u2] = testUserIds.slice(0, 2);
    const conv = getOrCreateDmConversation(u1, u2);
    expect(() => insertMessage(conv.id, u1, '   ')).toThrow('Message body cannot be empty');
  });

  it('trims body', async () => {
    const { getOrCreateDmConversation, insertMessage } = await import('@/lib/db/chat-queries');
    const [u1, u2] = testUserIds.slice(0, 2);
    const conv = getOrCreateDmConversation(u1, u2);
    const msg = insertMessage(conv.id, u1, '  hello  ');
    expect(msg.body).toBe('hello');
  });

  it('rejects non-participant', async () => {
    const { getOrCreateDmConversation, insertMessage } = await import('@/lib/db/chat-queries');
    const [u1, u2, u3] = testUserIds;
    const conv = getOrCreateDmConversation(u1, u2);
    expect(() => insertMessage(conv.id, u3, 'hi')).toThrow('not a participant');
  });
});
