export interface Campaign {
	id: string;
	roomCode: string;
	directorUserId: string;
	name: string;
	description: string;
	createdAt: string;
}

export interface CampaignPlayer {
	campaignId: string;
	userId: string;
	heroId: string;
	displayName: string;
	joinedAt: string;
}

export interface UserProfile {
	userId: string;
	displayName: string;
	avatarColor: string;
}

export interface BackupEntry {
	id: string;
	userId: string;
	dataType: 'hero' | 'sourcebook' | 'session';
	dataId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any;
	label: string;
	createdAt: string;
	expiresAt: string | null;
}

export interface CursorState {
	userId: string;
	displayName: string;
	color: string;
	cursorX: number;
	cursorY: number;
}
