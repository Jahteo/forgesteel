import { PatreonConnection } from '@/models/patreon-connection';

export type FSDataSource = 'Local' | 'Patron' | 'Warehouse' | 'Supabase' | undefined;

export interface ConnectionSettings {
	useManualWarehouse: boolean;
	warehouseHost: string;
	warehouseToken: string;
	patreonConnected: boolean;
	usePatreonWarehouse: boolean;
	patreonConnections: PatreonConnection[];
	dataSource: FSDataSource;
	useSupabase: boolean;
	supabaseUrl: string;
	supabaseAnonKey: string;
	activeCampaignId: string;
}
