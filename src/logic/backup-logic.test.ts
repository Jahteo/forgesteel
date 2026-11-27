import { BACKUP_FORMAT, BACKUP_VERSION, Backup, BackupLogic } from '@/logic/backup-logic';
import { describe, expect, test, vi } from 'vitest';
import { DataService } from '@/services/data-service';
import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';

const hero = (id: string) => ({ id: id, name: id }) as Hero;
const sourcebook = (id: string) => ({ id: id, name: id }) as Sourcebook;

// An in-memory stand-in for the data service
const createDataService = (initial: { heroes: Hero[], sourcebooks: Sourcebook[], session: Session, options: Options, hidden: string[] }) => {
	const store = {
		heroes: [ ...initial.heroes ],
		sourcebooks: [ ...initial.sourcebooks ],
		session: initial.session,
		options: initial.options,
		hidden: [ ...initial.hidden ]
	};

	const service = {
		getHeroes: vi.fn(() => Promise.resolve([ ...store.heroes ])),
		saveHero: vi.fn((h: Hero) => {
			store.heroes = [ ...store.heroes.filter(x => x.id !== h.id), h ];
			return Promise.resolve(h);
		}),
		deleteHero: vi.fn((id: string) => {
			store.heroes = store.heroes.filter(x => x.id !== id);
			return Promise.resolve();
		}),
		getHomebrew: vi.fn(() => Promise.resolve([ ...store.sourcebooks ])),
		saveSourcebook: vi.fn((sb: Sourcebook) => {
			store.sourcebooks = [ ...store.sourcebooks.filter(x => x.id !== sb.id), sb ];
			return Promise.resolve(sb);
		}),
		deleteSourcebook: vi.fn((id: string) => {
			store.sourcebooks = store.sourcebooks.filter(x => x.id !== id);
			return Promise.resolve();
		}),
		getSession: vi.fn(() => Promise.resolve(store.session)),
		saveSession: vi.fn((s: Session) => {
			store.session = s;
			return Promise.resolve(s);
		}),
		getOptions: vi.fn(() => Promise.resolve(store.options)),
		saveOptions: vi.fn((o: Options) => {
			store.options = o;
			return Promise.resolve(o);
		}),
		getHiddenSourcebookIDs: vi.fn(() => Promise.resolve([ ...store.hidden ])),
		saveHiddenSourcebookIDs: vi.fn((ids: string[]) => {
			store.hidden = ids;
			return Promise.resolve(ids);
		})
	};

	return { service: service as unknown as DataService, store: store };
};

const createSessionWithEncounter = () => {
	const session = FactoryLogic.createSession();
	session.encounters.push(FactoryLogic.createEncounter());
	return session;
};

const createBackup = (overrides: Partial<Backup> = {}): Backup => ({
	format: BACKUP_FORMAT,
	version: BACKUP_VERSION,
	created: '2026-11-27T10:00:00.000Z',
	heroes: [ hero('h1') ],
	homebrewSourcebooks: [ sourcebook('sb1') ],
	session: createSessionWithEncounter(),
	options: FactoryLogic.createOptions(),
	hiddenSourcebookIDs: [ 'hidden-1' ],
	...overrides
});

describe('createBackup', () => {
	test('includes everything from the data service', async () => {
		const options = FactoryLogic.createOptions();
		const session = createSessionWithEncounter();
		const { service } = createDataService({ heroes: [ hero('h1'), hero('h2') ], sourcebooks: [ sourcebook('sb1') ], session: session, options: options, hidden: [ 'x' ] });

		const backup = await BackupLogic.createBackup(service);

		expect(backup.format).toBe(BACKUP_FORMAT);
		expect(backup.version).toBe(BACKUP_VERSION);
		expect(backup.heroes.map(h => h.id)).toEqual([ 'h1', 'h2' ]);
		expect(backup.homebrewSourcebooks.map(sb => sb.id)).toEqual([ 'sb1' ]);
		expect(backup.session).toEqual(session);
		expect(backup.options).toEqual(options);
		expect(backup.hiddenSourcebookIDs).toEqual([ 'x' ]);
	});

	test('does not include connection settings', async () => {
		const { service } = createDataService({ heroes: [], sourcebooks: [], session: FactoryLogic.createSession(), options: FactoryLogic.createOptions(), hidden: [] });

		const backup = await BackupLogic.createBackup(service);

		expect(Object.keys(backup)).not.toContain('connectionSettings');
		expect(JSON.stringify(backup)).not.toContain('warehouseToken');
	});
});

describe('parseBackup', () => {
	test('reads a backup it wrote', () => {
		const backup = createBackup();

		expect(BackupLogic.parseBackup(JSON.stringify(backup))).toEqual(backup);
	});

	test('rejects a file that is not JSON', () => {
		expect(() => BackupLogic.parseBackup('not json')).toThrow('isn\'t a Forge Steel backup');
	});

	test('rejects other Forge Steel files, such as a hero', () => {
		expect(() => BackupLogic.parseBackup(JSON.stringify(hero('h1')))).toThrow('isn\'t a Forge Steel backup');
	});

	test('rejects a backup from a newer version', () => {
		const backup = createBackup({ version: BACKUP_VERSION + 1 });

		expect(() => BackupLogic.parseBackup(JSON.stringify(backup))).toThrow('newer version');
	});

	test('rejects a backup with missing parts', () => {
		const backup = createBackup() as Partial<Backup>;
		delete backup.heroes;

		expect(() => BackupLogic.parseBackup(JSON.stringify(backup))).toThrow('incomplete or damaged');
	});
});

describe('restoreBackup', () => {
	test('replaces everything with the contents of the backup', async () => {
		const { service, store } = createDataService({
			heroes: [ hero('h1'), hero('h-not-in-backup') ],
			sourcebooks: [ sourcebook('sb-not-in-backup') ],
			session: FactoryLogic.createSession(),
			options: FactoryLogic.createOptions(),
			hidden: []
		});
		const backup = createBackup({ heroes: [ { ...hero('h1'), name: 'Restored' }, hero('h2') ] });

		await BackupLogic.restoreBackup(backup, service);

		expect(store.heroes.map(h => h.id).sort()).toEqual([ 'h1', 'h2' ]);
		expect(store.heroes.find(h => h.id === 'h1')?.name).toBe('Restored');
		expect(store.sourcebooks.map(sb => sb.id)).toEqual([ 'sb1' ]);
		expect(store.session).toEqual(backup.session);
		expect(store.options).toEqual(backup.options);
		expect(store.hidden).toEqual([ 'hidden-1' ]);
	});

	test('round-trips: restoring a backup into empty storage reproduces it', async () => {
		const original = createDataService({ heroes: [ hero('a'), hero('b') ], sourcebooks: [ sourcebook('c') ], session: createSessionWithEncounter(), options: FactoryLogic.createOptions(), hidden: [ 'd' ] });
		const empty = createDataService({ heroes: [], sourcebooks: [], session: FactoryLogic.createSession(), options: FactoryLogic.createOptions(), hidden: [] });

		const backup = BackupLogic.parseBackup(JSON.stringify(await BackupLogic.createBackup(original.service)));
		await BackupLogic.restoreBackup(backup, empty.service);

		const restored = await BackupLogic.createBackup(empty.service);
		expect({ ...restored, created: '' }).toEqual({ ...backup, created: '' });
	});
});

describe('summarize', () => {
	test('counts heroes, sourcebooks, and session items', () => {
		const session = createSessionWithEncounter();
		session.counters.push({ id: 'c', name: 'Counter', description: '', value: 0 });

		expect(BackupLogic.summarize(createBackup({ session: session }))).toEqual({ heroes: 1, homebrewSourcebooks: 1, sessionItems: 2 });
	});
});

describe('parseSession', () => {
	test('reads an exported session', () => {
		const session = createSessionWithEncounter();

		expect(BackupLogic.parseSession(JSON.stringify(session))).toEqual(session);
	});

	test('fills in lists missing from older sessions', () => {
		const result = BackupLogic.parseSession(JSON.stringify({ encounters: [] }));

		expect(result).toEqual(FactoryLogic.createSession());
	});

	test('rejects a file that is not JSON', () => {
		expect(() => BackupLogic.parseSession('{')).toThrow('isn\'t a Forge Steel session');
	});

	test('rejects other Forge Steel files, such as a hero or a backup', () => {
		expect(() => BackupLogic.parseSession(JSON.stringify(hero('h1')))).toThrow('isn\'t a Forge Steel session');
		expect(() => BackupLogic.parseSession(JSON.stringify({ encounters: 'nope' }))).toThrow('isn\'t a Forge Steel session');
	});
});

describe('getBackupFileName', () => {
	test('includes the date', () => {
		expect(BackupLogic.getBackupFileName(new Date(2026, 10, 7))).toBe('Forge Steel Backup 2026-11-07');
	});
});
