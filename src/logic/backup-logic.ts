import { DataService } from '@/services/data-service';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';

export const BACKUP_FORMAT = 'forgesteel-backup';
export const BACKUP_VERSION = 1;

/**
 * Everything a user has saved, in one file.
 *
 * Connection settings (Patreon / Warehouse) are deliberately left out: they hold access
 * tokens, and they describe this device's connection rather than the user's data.
 */
export interface Backup {
	format: typeof BACKUP_FORMAT;
	version: number;
	created: string;
	heroes: Hero[];
	homebrewSourcebooks: Sourcebook[];
	session: Session;
	options: Options;
	hiddenSourcebookIDs: string[];
}

export interface BackupSummary {
	heroes: number;
	homebrewSourcebooks: number;
	sessionItems: number;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
	return (typeof value === 'object') && (value !== null) && !Array.isArray(value);
};

export class BackupLogic {
	static createBackup = async (dataService: DataService): Promise<Backup> => {
		const [ heroes, homebrewSourcebooks, session, options, hiddenSourcebookIDs ] = await Promise.all([
			BackupLogic.getFullHeroes(dataService),
			dataService.getHomebrew(),
			dataService.getSession(),
			dataService.getOptions(),
			dataService.getHiddenSourcebookIDs()
		]);

		return {
			format: BACKUP_FORMAT,
			version: BACKUP_VERSION,
			created: new Date().toISOString(),
			heroes: heroes,
			homebrewSourcebooks: homebrewSourcebooks,
			session: session,
			options: options,
			hiddenSourcebookIDs: hiddenSourcebookIDs
		};
	};

	/**
	 * With cloud (Warehouse) storage, getHeroes() only returns a summary of each hero (name and folder),
	 * so each hero is fetched in full. If any can't be fetched, no backup is made, rather than an incomplete one.
	 */
	static getFullHeroes = async (dataService: DataService): Promise<Hero[]> => {
		const summaries = await dataService.getHeroes();
		const heroes = await Promise.all(summaries.map(s => dataService.getHero(s.id)));

		const missing = summaries.filter((_s, n) => !heroes[n]);
		if (missing.length > 0) {
			throw new Error(`These heroes couldn't be loaded, so no backup was made: ${missing.map(h => h.name || h.id).join(', ')}`);
		}

		return heroes as Hero[];
	};

	/**
	 * Parses and checks the contents of a backup file.
	 * Throws an Error with a user-readable message if the file isn't a usable backup.
	 */
	static parseBackup = (json: string): Backup => {
		let data: unknown;
		try {
			data = JSON.parse(json);
		} catch {
			throw new Error('This file isn\'t a Forge Steel backup (it couldn\'t be read).');
		}

		if (!isObject(data) || (data.format !== BACKUP_FORMAT)) {
			throw new Error('This file isn\'t a Forge Steel backup.');
		}

		if ((typeof data.version !== 'number') || (data.version > BACKUP_VERSION)) {
			throw new Error('This backup was made by a newer version of Forge Steel; update the app and try again.');
		}

		if (!Array.isArray(data.heroes) || !Array.isArray(data.homebrewSourcebooks) || !BackupLogic.isSession(data.session) || !isObject(data.options) || !Array.isArray(data.hiddenSourcebookIDs)) {
			throw new Error('This backup is incomplete or damaged.');
		}

		return data as unknown as Backup;
	};

	/**
	 * Replaces everything currently saved with the contents of the backup.
	 * Heroes and homebrew sourcebooks that aren't in the backup are deleted.
	 * The app should be reloaded afterwards, so the restored data goes through the normal load (and update) path.
	 */
	static restoreBackup = async (backup: Backup, dataService: DataService) => {
		const [ currentHeroes, currentSourcebooks ] = await Promise.all([
			dataService.getHeroes(),
			dataService.getHomebrew()
		]);

		const heroIDs = backup.heroes.map(h => h.id);
		const sourcebookIDs = backup.homebrewSourcebooks.map(sb => sb.id);

		// Done one at a time, so a storage error leaves things in a known state
		for (const hero of currentHeroes.filter(h => !heroIDs.includes(h.id))) {
			await dataService.deleteHero(hero.id);
		}
		for (const sourcebook of currentSourcebooks.filter(sb => !sourcebookIDs.includes(sb.id))) {
			await dataService.deleteSourcebook(sourcebook.id);
		}
		for (const hero of backup.heroes) {
			await dataService.saveHero(hero);
		}
		for (const sourcebook of backup.homebrewSourcebooks) {
			await dataService.saveSourcebook(sourcebook);
		}

		await dataService.saveSession(backup.session);
		await dataService.saveOptions(backup.options);
		await dataService.saveHiddenSourcebookIDs(backup.hiddenSourcebookIDs);
	};

	static summarize = (backup: Backup): BackupSummary => {
		return {
			heroes: backup.heroes.length,
			homebrewSourcebooks: backup.homebrewSourcebooks.length,
			sessionItems: BackupLogic.countSessionItems(backup.session)
		};
	};

	static countSessionItems = (session: Session) => {
		return (session.encounters?.length ?? 0)
			+ (session.montages?.length ?? 0)
			+ (session.negotiations?.length ?? 0)
			+ (session.tacticalMaps?.length ?? 0)
			+ (session.counters?.length ?? 0);
	};

	/**
	 * Parses and checks the contents of an exported session file.
	 * Throws an Error with a user-readable message if the file isn't a usable session.
	 */
	static parseSession = (json: string): Session => {
		let data: unknown;
		try {
			data = JSON.parse(json);
		} catch {
			throw new Error('This file isn\'t a Forge Steel session (it couldn\'t be read).');
		}

		if (!BackupLogic.isSession(data)) {
			throw new Error('This file isn\'t a Forge Steel session.');
		}

		const session = data as Session;
		// Older sessions may lack some lists; fill them in so the rest of the app can rely on them
		session.counters = session.counters ?? [];
		session.encounters = session.encounters ?? [];
		session.montages = session.montages ?? [];
		session.negotiations = session.negotiations ?? [];
		session.tacticalMaps = session.tacticalMaps ?? [];
		session.playerViewID = session.playerViewID ?? null;
		return session;
	};

	static isSession = (value: unknown): boolean => {
		if (!isObject(value)) {
			return false;
		}

		const lists = [ 'counters', 'encounters', 'montages', 'negotiations', 'tacticalMaps' ];
		// Every list that is present must be a list, and at least one must be present
		return lists.every(key => (value[key] === undefined) || Array.isArray(value[key]))
			&& lists.some(key => Array.isArray(value[key]));
	};

	static getBackupFileName = (date: Date = new Date()) => {
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `Forge Steel Backup ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	};
}
