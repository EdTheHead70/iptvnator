import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { EpgQueryService } from './epg-query.service';

const getDatabase = jest.fn();
jest.mock('../database/connection', () => ({
    getDatabase: () => getDatabase(),
}));

// Node's SQLite executes the actual generated SQL without requiring a Node-ABI
// rebuild of the Electron better-sqlite3 binary.
const { DatabaseSync } = require('node:sqlite');

describe('large current-program SQLite lookups', () => {
    it('returns every channel beyond the SQLite variable limit with source scoping', async () => {
        const sqlite = new DatabaseSync(':memory:');
        try {
            sqlite.exec(`CREATE TABLE epg_programs (
                id INTEGER PRIMARY KEY, channel_id TEXT, start TEXT, stop TEXT,
                title TEXT, description TEXT, category TEXT, icon_url TEXT,
                rating TEXT, episode_num TEXT, source_url TEXT
            )`);
            const insert = sqlite.prepare(`INSERT INTO epg_programs
                (channel_id, start, stop, title, source_url)
                VALUES (?, '2026-11-02T00:00:00Z', '2026-11-03T00:00:00Z', ?, ?)`);
            const ids = Array.from({ length: 33000 }, (_, i) => `channel-${i}`);
            sqlite.exec('BEGIN');
            for (const id of ids) {
                insert.run(id, 'Other source', 'other');
                insert.run(id, 'Current programme', 'active');
            }
            sqlite.exec('COMMIT');
            getDatabase.mockResolvedValue(
                drizzle(async (query, params) => {
                    const statement = sqlite.prepare(query);
                    statement.setReturnArrays(true);
                    return { rows: statement.all(...params) };
                })
            );
            const result = await new EpgQueryService().getCurrentProgramsBatch(
                ids,
                {
                    sourceUrls: ['active'],
                    nowMs: Date.parse('2026-11-02T12:00:00Z'),
                }
            );
            expect(Object.keys(result)).toHaveLength(ids.length);
            for (const id of ids) {
                expect(result[id]?.title).toBe('Current programme');
            }
        } finally {
            sqlite.close();
        }
    });
});
