import { ConnectionSettings } from '@/models/connection-settings';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (settings: ConnectionSettings): SupabaseClient | null => {
	if (!settings.useSupabase || !settings.supabaseUrl || !settings.supabaseAnonKey) {
		return null;
	}
	if (
		settings.supabaseUrl === cachedUrl &&
		settings.supabaseAnonKey === cachedKey &&
		cachedClient
	) {
		return cachedClient;
	}
	cachedClient = createClient(settings.supabaseUrl, settings.supabaseAnonKey);
	cachedUrl = settings.supabaseUrl;
	cachedKey = settings.supabaseAnonKey;
	return cachedClient;
};
