import { BackupEntry } from '@/models/campaign';
import { SupabaseClient } from '@supabase/supabase-js';
import { Utils } from '@/utils/utils';
import localforage from 'localforage';

const LOCAL_BACKUP_KEY = 'forgesteel-backups';

export interface BackupService {
	createBackup(dataType: 'hero' | 'sourcebook' | 'session', dataId: string, data: unknown, label: string): Promise<void>;
	listBackups(dataType?: string, dataId?: string): Promise<BackupEntry[]>;
	restoreBackup(backupId: string): Promise<unknown>;
	deleteBackup(backupId: string): Promise<void>;
}

export class LocalBackupService implements BackupService {
	async createBackup(dataType: 'hero' | 'sourcebook' | 'session', dataId: string, data: unknown, label: string): Promise<void> {
		const backups = await this.getAllBackups();
		const entry: BackupEntry = {
			id: Utils.guid(),
			userId: 'local',
			dataType,
			dataId,
			data,
			label,
			createdAt: new Date().toISOString(),
			expiresAt: null
		};
		backups.push(entry);
		await localforage.setItem(LOCAL_BACKUP_KEY, backups);
	}

	async listBackups(dataType?: string, dataId?: string): Promise<BackupEntry[]> {
		const backups = await this.getAllBackups();
		return backups.filter(b => {
			if (dataType && b.dataType !== dataType) return false;
			if (dataId && b.dataId !== dataId) return false;
			return true;
		}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	async restoreBackup(backupId: string): Promise<unknown> {
		const backups = await this.getAllBackups();
		const entry = backups.find(b => b.id === backupId);
		if (!entry) throw new Error(`Backup ${backupId} not found`);
		return entry.data;
	}

	async deleteBackup(backupId: string): Promise<void> {
		const backups = await this.getAllBackups();
		await localforage.setItem(LOCAL_BACKUP_KEY, backups.filter(b => b.id !== backupId));
	}

	private async getAllBackups(): Promise<BackupEntry[]> {
		return (await localforage.getItem<BackupEntry[]>(LOCAL_BACKUP_KEY)) ?? [];
	}
}

export class SupabaseBackupService implements BackupService {
	private client: SupabaseClient;
	private localFallback: LocalBackupService;

	constructor(client: SupabaseClient) {
		this.client = client;
		this.localFallback = new LocalBackupService();
	}

	async createBackup(dataType: 'hero' | 'sourcebook' | 'session', dataId: string, data: unknown, label: string): Promise<void> {
		const { error } = await this.client.from('backups').insert({
			data_type: dataType,
			data_id: dataId,
			data,
			label
		});
		if (error) throw error;

		await this.localFallback.createBackup(dataType, dataId, data, label);
	}

	async listBackups(dataType?: string, dataId?: string): Promise<BackupEntry[]> {
		let query = this.client
			.from('backups')
			.select('*')
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (dataType) query = query.eq('data_type', dataType);
		if (dataId) query = query.eq('data_id', dataId);

		const { data, error } = await query;
		if (error) throw error;

		return (data ?? []).map(row => ({
			id: row.id,
			userId: row.user_id,
			dataType: row.data_type,
			dataId: row.data_id,
			data: row.data,
			label: row.label,
			createdAt: row.created_at,
			expiresAt: row.expires_at
		}));
	}

	async restoreBackup(backupId: string): Promise<unknown> {
		const { data, error } = await this.client
			.from('backups')
			.select('data')
			.eq('id', backupId)
			.single();
		if (error) throw error;
		return data.data;
	}

	async deleteBackup(backupId: string): Promise<void> {
		const { error } = await this.client.from('backups').delete().eq('id', backupId);
		if (error) throw error;
	}
}
