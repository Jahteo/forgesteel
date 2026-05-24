import { Campaign, CampaignPlayer } from '@/models/campaign';
import { Hero } from '@/models/hero';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService implements StorageService {
	private client: SupabaseClient;

	constructor(client: SupabaseClient) {
		this.client = client;
	}

	initialize(): Promise<boolean> {
		return Promise.resolve(true);
	}

	// #region Heroes

	async getHeroes(): Promise<Hero[]> {
		const { data, error } = await this.client
			.from('heroes')
			.select('data')
			.order('updated_at', { ascending: false });
		if (error) throw error;
		return (data ?? []).map(row => row.data as Hero);
	}

	async getHero(id: string): Promise<Hero | null> {
		const { data, error } = await this.client
			.from('heroes')
			.select('data')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data ? (data.data as Hero) : null;
	}

	async putHero(hero: Hero): Promise<Hero> {
		const updated = { ...hero, lastModified: new Date().toISOString() };
		const { error } = await this.client
			.from('heroes')
			.upsert({ id: hero.id, data: updated }, { onConflict: 'id,user_id' });
		if (error) throw error;
		return updated;
	}

	async deleteHero(id: string): Promise<void> {
		const { error } = await this.client.from('heroes').delete().eq('id', id);
		if (error) throw error;
	}

	// #endregion

	// #region Sourcebooks

	async getSourcebooks(): Promise<Sourcebook[]> {
		const { data, error } = await this.client
			.from('sourcebooks')
			.select('data')
			.order('updated_at', { ascending: false });
		if (error) throw error;
		return (data ?? []).map(row => row.data as Sourcebook);
	}

	async getSourcebook(id: string): Promise<Sourcebook | null> {
		const { data, error } = await this.client
			.from('sourcebooks')
			.select('data')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data ? (data.data as Sourcebook) : null;
	}

	async putSourcebook(sourcebook: Sourcebook): Promise<Sourcebook> {
		const { error } = await this.client
			.from('sourcebooks')
			.upsert({ id: sourcebook.id, data: sourcebook }, { onConflict: 'id,user_id' });
		if (error) throw error;
		return sourcebook;
	}

	async deleteSourcebook(id: string): Promise<void> {
		const { error } = await this.client.from('sourcebooks').delete().eq('id', id);
		if (error) throw error;
	}

	// #endregion

	// #region Session

	async getSession(campaignId?: string): Promise<Session | null> {
		const id = campaignId ?? '';
		if (!id) return null;
		const { data, error } = await this.client
			.from('sessions')
			.select('data')
			.eq('campaign_id', id)
			.maybeSingle();
		if (error) throw error;
		return data ? (data.data as Session) : null;
	}

	async putSession(session: Session, campaignId?: string): Promise<Session> {
		const id = campaignId ?? '';
		if (!id) throw new Error('campaignId required for Supabase session storage');
		const { error } = await this.client
			.from('sessions')
			.upsert({ campaign_id: id, data: session }, { onConflict: 'campaign_id' });
		if (error) throw error;
		return session;
	}

	// #endregion

	// #region Hidden sourcebook IDs

	async getHiddenSourcebookIDs(): Promise<string[] | null> {
		const { data, error } = await this.client
			.from('hidden_sourcebook_ids')
			.select('ids')
			.maybeSingle();
		if (error) throw error;
		return data ? (data.ids as string[]) : null;
	}

	async putHiddenSourcebookIDs(ids: string[]): Promise<string[]> {
		const { data: userData } = await this.client.auth.getUser();
		if (!userData.user) throw new Error('Not authenticated');
		const { error } = await this.client
			.from('hidden_sourcebook_ids')
			.upsert({ user_id: userData.user.id, ids }, { onConflict: 'user_id' });
		if (error) throw error;
		return ids;
	}

	// #endregion

	// #region Campaigns

	async getCampaigns(): Promise<Campaign[]> {
		const { data, error } = await this.client
			.from('campaigns')
			.select('*')
			.order('created_at', { ascending: false });
		if (error) throw error;
		return (data ?? []).map(row => ({
			id: row.id,
			roomCode: row.room_code,
			directorUserId: row.director_user_id,
			name: row.name,
			description: row.description ?? '',
			createdAt: row.created_at
		}));
	}

	async getEnrolledCampaigns(): Promise<Campaign[]> {
		const { data, error } = await this.client
			.from('campaign_players')
			.select('campaign_id, campaigns(*)')
			.order('joined_at', { ascending: false });
		if (error) throw error;
		return (data ?? [])
			.map(row => {
				const c = row.campaigns as typeof row.campaigns & {
					id: string; room_code: string; director_user_id: string;
					name: string; description: string; created_at: string;
				};
				if (!c) return null;
				return {
					id: c.id,
					roomCode: c.room_code,
					directorUserId: c.director_user_id,
					name: c.name,
					description: c.description ?? '',
					createdAt: c.created_at
				} as Campaign;
			})
			.filter((c): c is Campaign => c !== null);
	}

	async getCampaignByRoomCode(roomCode: string): Promise<Campaign | null> {
		const { data, error } = await this.client
			.from('campaigns')
			.select('*')
			.eq('room_code', roomCode)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return {
			id: data.id,
			roomCode: data.room_code,
			directorUserId: data.director_user_id,
			name: data.name,
			description: data.description ?? '',
			createdAt: data.created_at
		};
	}

	async putCampaign(campaign: Campaign): Promise<Campaign> {
		const { error } = await this.client
			.from('campaigns')
			.upsert({
				id: campaign.id || undefined,
				room_code: campaign.roomCode,
				name: campaign.name,
				description: campaign.description
			}, { onConflict: 'id' });
		if (error) throw error;
		return campaign;
	}

	async deleteCampaign(id: string): Promise<void> {
		const { error } = await this.client.from('campaigns').delete().eq('id', id);
		if (error) throw error;
	}

	async getCampaignPlayers(campaignId: string): Promise<CampaignPlayer[]> {
		const { data, error } = await this.client
			.from('campaign_players')
			.select('*')
			.eq('campaign_id', campaignId);
		if (error) throw error;
		return (data ?? []).map(row => ({
			campaignId: row.campaign_id,
			userId: row.user_id,
			heroId: row.hero_id,
			displayName: row.display_name ?? '',
			joinedAt: row.joined_at
		}));
	}

	async getMyEnrollment(campaignId: string): Promise<CampaignPlayer | null> {
		const { data, error } = await this.client
			.from('campaign_players')
			.select('*')
			.eq('campaign_id', campaignId)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return {
			campaignId: data.campaign_id,
			userId: data.user_id,
			heroId: data.hero_id,
			displayName: data.display_name ?? '',
			joinedAt: data.joined_at
		};
	}

	async enrollInCampaign(campaignId: string, heroId: string, displayName: string): Promise<void> {
		const { data: userData } = await this.client.auth.getUser();
		if (!userData.user) throw new Error('Not authenticated');
		const { error } = await this.client
			.from('campaign_players')
			.upsert({
				campaign_id: campaignId,
				user_id: userData.user.id,
				hero_id: heroId,
				display_name: displayName
			}, { onConflict: 'campaign_id,user_id' });
		if (error) throw error;
	}

	// #endregion
}
