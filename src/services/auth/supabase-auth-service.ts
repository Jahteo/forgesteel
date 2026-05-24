import { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';

export class SupabaseAuthService {
	private client: SupabaseClient;

	constructor(client: SupabaseClient) {
		this.client = client;
	}

	async signInWithEmail(email: string): Promise<void> {
		const { error } = await this.client.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: window.location.origin + window.location.pathname
			}
		});
		if (error) throw error;
	}

	async signOut(): Promise<void> {
		const { error } = await this.client.auth.signOut();
		if (error) throw error;
	}

	async getSession(): Promise<Session | null> {
		const { data, error } = await this.client.auth.getSession();
		if (error) throw error;
		return data.session;
	}

	async getUser(): Promise<User | null> {
		const { data, error } = await this.client.auth.getUser();
		if (error) return null;
		return data.user;
	}

	onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
		return this.client.auth.onAuthStateChange(callback);
	}
}
