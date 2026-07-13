import { CursorState, UserProfile } from '@/models/campaign';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { MapPosition } from '@/models/tactical-map';
import { Session } from '@/models/session';

export interface TokenMove {
	miniId: string;
	mapId: string;
	position: MapPosition;
}

type SessionCallback = (session: Session) => void;
type TokenMoveCallback = (move: TokenMove) => void;
type PresenceCallback = (cursors: CursorState[]) => void;

export class SupabaseRealtimeService {
	private client: SupabaseClient;
	private campaignId: string;
	private userProfile: UserProfile;
	private channel: RealtimeChannel | null = null;

	private sessionCallbacks: SessionCallback[] = [];
	private tokenMoveCallbacks: TokenMoveCallback[] = [];
	private presenceCallbacks: PresenceCallback[] = [];

	constructor(client: SupabaseClient, campaignId: string, userProfile: UserProfile) {
		this.client = client;
		this.campaignId = campaignId;
		this.userProfile = userProfile;
		this.connect();
	}

	private connect() {
		this.channel = this.client.channel(`campaign:${this.campaignId}`, {
			config: { presence: { key: this.userProfile.userId } }
		});

		this.channel
			.on('broadcast', { event: 'session_update' }, ({ payload }) => {
				this.sessionCallbacks.forEach(cb => cb(payload.session as Session));
			})
			.on('broadcast', { event: 'token_move' }, ({ payload }) => {
				this.tokenMoveCallbacks.forEach(cb => cb(payload as TokenMove));
			})
			.on('presence', { event: 'sync' }, () => {
				const state = this.channel!.presenceState();
				const cursors: CursorState[] = Object.values(state)
					.flat()
					.map((p: unknown) => p as CursorState)
					.filter(p => p.userId !== this.userProfile.userId);
				this.presenceCallbacks.forEach(cb => cb(cursors));
			})
			.subscribe(status => {
				if (status === 'SUBSCRIBED') {
					this.channel!.track({
						userId: this.userProfile.userId,
						displayName: this.userProfile.displayName,
						color: this.userProfile.avatarColor,
						cursorX: -1,
						cursorY: -1
					});
				}
			});
	}

	publishSession(session: Session): void {
		this.channel?.send({
			type: 'broadcast',
			event: 'session_update',
			payload: { session }
		});
	}

	publishTokenMove(move: TokenMove): void {
		this.channel?.send({
			type: 'broadcast',
			event: 'token_move',
			payload: move
		});
	}

	updateCursorPosition(x: number, y: number): void {
		this.channel?.track({
			userId: this.userProfile.userId,
			displayName: this.userProfile.displayName,
			color: this.userProfile.avatarColor,
			cursorX: x,
			cursorY: y
		});
	}

	subscribeToSession(callback: SessionCallback): void {
		this.sessionCallbacks.push(callback);
	}

	subscribeToTokenMoves(callback: TokenMoveCallback): void {
		this.tokenMoveCallbacks.push(callback);
	}

	subscribeToPresence(callback: PresenceCallback): void {
		this.presenceCallbacks.push(callback);
	}

	dispose(): void {
		if (this.channel) {
			this.client.removeChannel(this.channel);
			this.channel = null;
		}
		this.sessionCallbacks = [];
		this.tokenMoveCallbacks = [];
		this.presenceCallbacks = [];
	}
}
