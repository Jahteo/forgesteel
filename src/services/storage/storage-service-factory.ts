import { ConnectionSettings } from '@/models/connection-settings';
import { LocalService } from '@/services/storage/local-service';
import { StorageService } from '@/services/storage/storage-service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/services/storage/supabase-service';
import { WarehouseService } from '@/services/storage/warehouse-service';

export class StorageServiceFactory {
	static fromConnectionSettings = (settings: ConnectionSettings, supabaseClient?: SupabaseClient | null): StorageService => {
		if (settings.useSupabase && supabaseClient) {
			return new SupabaseService(supabaseClient);
		}
		if (settings.useManualWarehouse || settings.usePatreonWarehouse) {
			return new WarehouseService(settings);
		}
		return new LocalService();
	};
};
