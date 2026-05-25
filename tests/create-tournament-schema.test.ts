import { describe, it, expect } from 'vitest';
import { createTournamentSchema, parseOrThrow } from '@/lib/validations';

describe('createTournamentSchema', () => {
  it('accepts maxPlayers 8 with master_1000 category (server maps to brocco_500)', () => {
    const data = parseOrThrow(createTournamentSchema, {
      name: 'Test 8',
      date: '2026-06-15',
      maxPlayers: 8,
      category: 'master_1000',
    });
    expect(data.maxPlayers).toBe(8);
    expect(data.category).toBe('master_1000');
  });
});
