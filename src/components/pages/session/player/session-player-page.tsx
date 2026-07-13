import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { CounterRunPanel } from '@/components/panels/run/counter-run/counter-run-panel';
import { Empty } from '@/components/controls/empty/empty';
import { EncounterRunPanel } from '@/components/panels/run/encounter-run/encounter-run-panel';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Hero } from '@/models/hero';
import { HeroSyncModal } from '@/components/modals/hero-sync/hero-sync-modal';
import { LocalBackupService, SupabaseBackupService } from '@/services/backup/backup-service';
import { MapPosition } from '@/models/tactical-map';
import { MontageRunPanel } from '@/components/panels/run/montage-run/montage-run-panel';
import { NegotiationRunPanel } from '@/components/panels/run/negotiation-run/negotiation-run-panel';
import { PanelMode } from '@/enums/panel-mode';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { Spin } from 'antd';
import { SupabaseRealtimeService } from '@/services/realtime/supabase-realtime-service';
import { SupabaseService } from '@/services/storage/supabase-service';
import { TacticalMapDisplayType } from '@/enums/tactical-map-display-type';
import { TacticalMapPanel } from '@/components/panels/elements/tactical-map-panel/tactical-map-panel';
import { UserProfile } from '@/models/campaign';
import { getSupabaseClient } from '@/services/supabase-client-factory';
import { useEffect, useRef, useState } from 'react';
import { useHeroes, useSession } from '@/contexts/data-context';
import { useSearchParams } from 'react-router';
import localforage from 'localforage';

import './session-player-page.scss';

interface Props {
	sourcebooks: Sourcebook[];
	params: FooterParams;
}

export const SessionPlayerPage = (props: Props) => {
	const [ searchParams ] = useSearchParams();
	const roomCode = searchParams.get('room');

	if (roomCode) {
		return (
			<RemotePlayerPage
				roomCode={roomCode}
				sourcebooks={props.sourcebooks}
				params={props.params}
			/>
		);
	}

	return <LocalPlayerPage sourcebooks={props.sourcebooks} params={props.params} />;
};

// ─── Local player (existing behavior) ────────────────────────────────────────

const LocalPlayerPage = (props: Props) => {
	const session = useSession();
	const getContent = () => {
		const encounter = session.encounters.find(e => e.id === session.playerViewID);
		if (encounter) {
			return (
				<EncounterRunPanel
					encounter={encounter}
					sourcebooks={props.sourcebooks}
					onChange={() => null}
				/>
			);
		}

		const montage = session.montages.find(m => m.id === session.playerViewID);
		if (montage) {
			return (
				<MontageRunPanel
					montage={montage}
					onChange={() => null}
				/>
			);
		}

		const negotiation = session.negotiations.find(n => n.id === session.playerViewID);
		if (negotiation) {
			return (
				<NegotiationRunPanel
					negotiation={negotiation}
					onChange={() => null}
				/>
			);
		}

		const map = session.tacticalMaps.find(tm => tm.id === session.playerViewID);
		if (map) {
			return (
				<TacticalMapPanel
					key={JSON.stringify(map)}
					map={map}
					display={TacticalMapDisplayType.Player}
					encounters={session.encounters}
					sourcebooks={props.sourcebooks}
					mode={PanelMode.Full}
				/>
			);
		}

		const counter = session.counters.find(c => c.id === session.playerViewID);
		if (counter) {
			return (
				<CounterRunPanel
					counter={counter}
					onChange={() => null}
				/>
			);
		}

		return <Empty text='Your director is not currently sharing anything with you.' />;
	};

	return (
		<ErrorBoundary>
			<div className='session-player-page'>
				<AppHeader subheader='Forge Steel' />
				<ErrorBoundary>
					<div className='session-player-page-content'>
						{getContent()}
					</div>
				</ErrorBoundary>
				<AppFooter
					page='player-view'
					params={props.params}
				/>
			</div>
		</ErrorBoundary>
	);
};

// ─── Remote player (Supabase realtime) ───────────────────────────────────────

interface RemoteProps extends Props {
	roomCode: string;
}

const RemotePlayerPage = (props: RemoteProps) => {
	const localHeroes = useHeroes();
	const [ remoteSession, setRemoteSession ] = useState<Session | null>(null);
	const [ loading, setLoading ] = useState(true);
	const [ error, setError ] = useState<string | null>(null);
	const [ userProfile, setUserProfile ] = useState<UserProfile | null>(null);
	const [ showHeroSelector, setShowHeroSelector ] = useState(false);
	const [ remoteCursors, setRemoteCursors ] = useState<import('@/models/campaign').CursorState[]>([]);
	const realtimeRef = useRef<SupabaseRealtimeService | null>(null);
	const supabaseServiceRef = useRef<SupabaseService | null>(null);

	const storageKey = `forgesteel-player-hero-${props.roomCode}`;

	useEffect(() => {
		let mounted = true;

		const init = async () => {
			try {
				const connectionSettings = await localforage.getItem<import('@/models/connection-settings').ConnectionSettings>('forgesteel-connection-settings');
				if (!connectionSettings) {
					setError('Supabase is not configured. Please set up Supabase in settings first.');
					setLoading(false);
					return;
				}

				const client = getSupabaseClient(connectionSettings);
				if (!client) {
					setError('Supabase is not enabled. Please configure Supabase in settings.');
					setLoading(false);
					return;
				}

				const { data: userData } = await client.auth.getUser();
				if (!userData.user) {
					setError('You must be signed in to Supabase to join a campaign. Please sign in from Settings.');
					setLoading(false);
					return;
				}

				const svc = new SupabaseService(client);
				supabaseServiceRef.current = svc;

				const campaign = await svc.getCampaignByRoomCode(props.roomCode);
				if (!campaign) {
					setError(`Campaign with room code "${props.roomCode}" not found.`);
					setLoading(false);
					return;
				}

				const profile: UserProfile = {
					userId: userData.user.id,
					displayName: userData.user.email ?? userData.user.id,
					avatarColor: '#4a9eff'
				};
				if (mounted) setUserProfile(profile);

				// Check enrollment
				const enrollment = await svc.getMyEnrollment(campaign.id);
				if (!enrollment) {
					// Show hero selector to enroll
					if (mounted) {
						setLoading(false);
						setShowHeroSelector(true);
					}
					return;
				}

				// Load session
				const session = await svc.getSession(campaign.id);
				if (mounted) {
					setRemoteSession(session);
					setLoading(false);
				}

				// Set up realtime
				const realtime = new SupabaseRealtimeService(client, campaign.id, profile);
				realtimeRef.current = realtime;
				realtime.subscribeToSession(updatedSession => {
					if (mounted) setRemoteSession(updatedSession);
				});
				realtime.subscribeToPresence(cursors => {
					if (mounted) setRemoteCursors(cursors);
				});

			} catch (e) {
				if (mounted) {
					setError((e as Error).message);
					setLoading(false);
				}
			}
		};

		init();

		return () => {
			mounted = false;
			realtimeRef.current?.dispose();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ props.roomCode ]);

	const handleHeroSelected = async (hero: Hero) => {
		setShowHeroSelector(false);
		if (!supabaseServiceRef.current || !userProfile) return;

		const connectionSettings = await localforage.getItem<import('@/models/connection-settings').ConnectionSettings>('forgesteel-connection-settings');
		if (!connectionSettings) return;
		const client = getSupabaseClient(connectionSettings);
		if (!client) return;

		const svc = supabaseServiceRef.current;
		const campaign = await svc.getCampaignByRoomCode(props.roomCode);
		if (!campaign) return;

		await svc.enrollInCampaign(campaign.id, hero.id, userProfile.displayName);
		await localforage.setItem(storageKey, hero.id);

		const session = await svc.getSession(campaign.id);
		setRemoteSession(session);

		const realtime = new SupabaseRealtimeService(client, campaign.id, userProfile);
		realtimeRef.current?.dispose();
		realtimeRef.current = realtime;
		realtime.subscribeToSession(updatedSession => setRemoteSession(updatedSession));
		realtime.subscribeToPresence(cursors => setRemoteCursors(cursors));
	};

	const handleTokenMove = (miniId: string, mapId: string, position: MapPosition) => {
		realtimeRef.current?.publishTokenMove({ miniId, mapId, position });
	};

	const handleCursorMove = (x: number, y: number) => {
		realtimeRef.current?.updateCursorPosition(x, y);
	};

	const backupService = supabaseServiceRef.current
		? new SupabaseBackupService(supabaseServiceRef.current['client' as keyof SupabaseService] as never)
		: new LocalBackupService();

	if (loading) {
		return (
			<div className='session-player-page'>
				<AppHeader subheader='Forge Steel' />
				<div className='session-player-page-content' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<Spin size='large' />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='session-player-page'>
				<AppHeader subheader='Forge Steel' />
				<div className='session-player-page-content'>
					<Empty text={error} />
				</div>
			</div>
		);
	}

	const getContent = () => {
		if (!remoteSession) {
			return <Empty text='Waiting for the director to start a session...' />;
		}

		const encounter = remoteSession.encounters.find(e => e.id === remoteSession.playerViewID);
		if (encounter) {
			return (
				<EncounterRunPanel
					encounter={encounter}
					sourcebooks={props.sourcebooks}
					onChange={() => null}
				/>
			);
		}

		const montage = remoteSession.montages.find(m => m.id === remoteSession.playerViewID);
		if (montage) {
			return <MontageRunPanel montage={montage} onChange={() => null} />;
		}

		const negotiation = remoteSession.negotiations.find(n => n.id === remoteSession.playerViewID);
		if (negotiation) {
			return <NegotiationRunPanel negotiation={negotiation} onChange={() => null} />;
		}

		const map = remoteSession.tacticalMaps.find(tm => tm.id === remoteSession.playerViewID);
		if (map) {
			return (
				<TacticalMapPanel
					key={map.id}
					map={map}
					display={TacticalMapDisplayType.Player}
					encounters={remoteSession.encounters}
					sourcebooks={props.sourcebooks}
					mode={PanelMode.Full}
					remoteCursors={remoteCursors}
					onCursorMove={handleCursorMove}
					onTokenMove={handleTokenMove}
				/>
			);
		}

		const counter = remoteSession.counters.find(c => c.id === remoteSession.playerViewID);
		if (counter) {
			return <CounterRunPanel counter={counter} onChange={() => null} />;
		}

		return <Empty text='Your director is not currently sharing anything with you.' />;
	};

	return (
		<ErrorBoundary>
			<div className='session-player-page'>
				<AppHeader subheader='Forge Steel' />
				<ErrorBoundary>
					<div className='session-player-page-content'>
						{getContent()}
					</div>
				</ErrorBoundary>
				<AppFooter page='player-view' params={props.params} />
			</div>

			{showHeroSelector && supabaseServiceRef.current && (
				<HeroSyncModal
					open={true}
					localHeroes={localHeroes}
					supabaseService={supabaseServiceRef.current}
					backupService={backupService}
					mode='join'
					onHeroSelected={handleHeroSelected}
					onLocalHeroSaved={() => {}}
					onClose={() => {}}
				/>
			)}
		</ErrorBoundary>
	);
};
