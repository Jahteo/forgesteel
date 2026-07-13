import { Badge, Button, Card, Empty, Flex, Modal, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloudDownloadOutlined, CloudUploadOutlined, SwapOutlined, SyncOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { BackupService } from '@/services/backup/backup-service';
import { ConfirmOverrideModal } from '@/components/modals/confirm-override/confirm-override-modal';
import { Hero } from '@/models/hero';
import { SupabaseService } from '@/services/storage/supabase-service';

type SyncStatus = 'local-only' | 'supabase-only' | 'in-sync' | 'local-newer' | 'supabase-newer';

interface HeroEntry {
	id: string;
	name: string;
	localHero: Hero | null;
	remoteHero: Hero | null;
	localTimestamp: string | null;
	remoteTimestamp: string | null;
	status: SyncStatus;
}

interface PendingOverride {
	entry: HeroEntry;
	direction: 'push' | 'pull';
}

interface Props {
	open: boolean;
	localHeroes: Hero[];
	supabaseService: SupabaseService;
	backupService: BackupService;
	mode?: 'sync' | 'join';
	onHeroSelected?: (hero: Hero) => void;
	onLocalHeroSaved?: (hero: Hero) => void;
	onClose: () => void;
}

export const HeroSyncModal = (props: Props) => {
	const [ entries, setEntries ] = useState<HeroEntry[]>([]);
	const [ loading, setLoading ] = useState(false);
	const [ pendingOverride, setPendingOverride ] = useState<PendingOverride | null>(null);
	const [ processing, setProcessing ] = useState<string | null>(null);

	const buildEntries = useCallback(async () => {
		setLoading(true);
		try {
			const remoteHeroes = await props.supabaseService.getHeroes();
			const allIds = new Set([
				...props.localHeroes.map(h => h.id),
				...remoteHeroes.map(h => h.id)
			]);

			const result: HeroEntry[] = [];
			for (const id of allIds) {
				const local = props.localHeroes.find(h => h.id === id) ?? null;
				const remote = remoteHeroes.find(h => h.id === id) ?? null;
				const localTs = local?.lastModified ?? null;
				const remoteTs = remote?.lastModified ?? null;

				let status: SyncStatus;
				if (local && !remote) {
					status = 'local-only';
				} else if (!local && remote) {
					status = 'supabase-only';
				} else if (localTs === remoteTs) {
					status = 'in-sync';
				} else if (localTs && remoteTs && localTs > remoteTs) {
					status = 'local-newer';
				} else {
					status = 'supabase-newer';
				}

				result.push({
					id,
					name: (local ?? remote)!.name,
					localHero: local,
					remoteHero: remote,
					localTimestamp: localTs,
					remoteTimestamp: remoteTs,
					status
				});
			}
			result.sort((a, b) => a.name.localeCompare(b.name));
			setEntries(result);
		} finally {
			setLoading(false);
		}
	}, [ props.localHeroes, props.supabaseService ]);

	useEffect(() => {
		if (props.open) buildEntries();
	}, [ props.open, buildEntries ]);

	const push = async (entry: HeroEntry) => {
		if (!entry.localHero) return;
		setProcessing(entry.id);
		try {
			if (entry.remoteHero) {
				await props.backupService.createBackup('hero', entry.id, entry.remoteHero, `Before local override of "${entry.name}"`);
			}
			await props.supabaseService.putHero(entry.localHero);
			await buildEntries();
		} finally {
			setProcessing(null);
		}
	};

	const pull = async (entry: HeroEntry) => {
		if (!entry.remoteHero) return;
		setProcessing(entry.id);
		try {
			if (entry.localHero) {
				await props.backupService.createBackup('hero', entry.id, entry.localHero, `Before Supabase override of "${entry.name}"`);
			}
			props.onLocalHeroSaved?.(entry.remoteHero);
			await buildEntries();
		} finally {
			setProcessing(null);
		}
	};

	const handleOverrideConfirm = async () => {
		if (!pendingOverride) return;
		const { entry, direction } = pendingOverride;
		setPendingOverride(null);
		if (direction === 'push') {
			await push(entry);
		} else {
			await pull(entry);
		}
	};

	const statusBadge = (status: SyncStatus) => {
		const configs: Record<SyncStatus, { color: string; text: string }> = {
			'local-only':     { color: 'default', text: 'Local only' },
			'supabase-only':  { color: 'blue',    text: 'Supabase only' },
			'in-sync':        { color: 'success',  text: 'In sync' },
			'local-newer':    { color: 'warning',  text: 'Local newer' },
			'supabase-newer': { color: 'processing', text: 'Supabase newer' }
		};
		const { color, text } = configs[status];
		return <Tag color={color}>{text}</Tag>;
	};

	const renderActions = (entry: HeroEntry) => {
		const busy = processing === entry.id;
		const actions: React.ReactNode[] = [];

		if (entry.status === 'local-only') {
			actions.push(
				<Button key='push' size='small' icon={<CloudUploadOutlined />} loading={busy}
					onClick={() => push(entry)}>
					Upload to Supabase
				</Button>
			);
		}
		if (entry.status === 'supabase-only') {
			actions.push(
				<Button key='pull' size='small' icon={<CloudDownloadOutlined />} loading={busy}
					onClick={() => pull(entry)}>
					Download to Local
				</Button>
			);
		}
		if (entry.status === 'local-newer' || entry.status === 'supabase-newer') {
			actions.push(
				<Button key='push' size='small' icon={<CloudUploadOutlined />} loading={busy}
					onClick={() => setPendingOverride({ entry, direction: 'push' })}>
					Push Local → Supabase
				</Button>,
				<Button key='pull' size='small' icon={<CloudDownloadOutlined />} loading={busy}
					onClick={() => setPendingOverride({ entry, direction: 'pull' })}>
					Pull Supabase → Local
				</Button>
			);
		}
		if (entry.status === 'in-sync') {
			actions.push(
				<Flex key='sync' gap='small' align='center'>
					<CheckCircleOutlined style={{ color: '#52c41a' }} />
					<Typography.Text type='secondary'>In sync</Typography.Text>
				</Flex>
			);
		}

		if (props.mode === 'join') {
			const hero = entry.localHero ?? entry.remoteHero;
			if (hero) {
				actions.push(
					<Button key='join' type='primary' size='small'
						onClick={() => props.onHeroSelected?.(hero)}>
						Join with this hero
					</Button>
				);
			}
		}

		return actions;
	};

	return (
		<>
			<Modal
				open={props.open}
				title={
					<Flex gap='small' align='center'>
						<SyncOutlined spin={loading} />
						<span>{props.mode === 'join' ? 'Select Your Hero' : 'Sync Heroes'}</span>
					</Flex>
				}
				onCancel={props.onClose}
				footer={
					<Flex justify='space-between' align='center'>
						<Button icon={<SyncOutlined />} onClick={buildEntries} loading={loading}>
							Refresh
						</Button>
						<Button onClick={props.onClose}>Close</Button>
					</Flex>
				}
				width={680}
			>
				{entries.length === 0 && !loading ? (
					<Empty description='No heroes found in local storage or Supabase.' />
				) : (
					<Space direction='vertical' style={{ width: '100%' }}>
						{entries.map(entry => (
							<Card
								key={entry.id}
								size='small'
								title={
									<Flex gap='small' align='center'>
										<SwapOutlined />
										<strong>{entry.name}</strong>
										{statusBadge(entry.status)}
									</Flex>
								}
							>
								<Flex vertical gap='small'>
									<Flex gap='large'>
										{entry.localTimestamp && (
											<Typography.Text type='secondary'>
												Local: {new Date(entry.localTimestamp).toLocaleString()}
											</Typography.Text>
										)}
										{entry.remoteTimestamp && (
											<Typography.Text type='secondary'>
												Supabase: {new Date(entry.remoteTimestamp).toLocaleString()}
											</Typography.Text>
										)}
									</Flex>
									<Flex gap='small' wrap>
										{renderActions(entry)}
									</Flex>
								</Flex>
							</Card>
						))}
					</Space>
				)}
			</Modal>

			{pendingOverride && (
				<ConfirmOverrideModal
					open={true}
					itemType='Hero'
					itemName={pendingOverride.entry.name}
					sourceLabel={pendingOverride.direction === 'push' ? 'Local' : 'Supabase'}
					targetLabel={pendingOverride.direction === 'push' ? 'Supabase' : 'Local'}
					sourceTimestamp={
						pendingOverride.direction === 'push'
							? pendingOverride.entry.localTimestamp
							: pendingOverride.entry.remoteTimestamp
					}
					onConfirm={handleOverrideConfirm}
					onCancel={() => setPendingOverride(null)}
				/>
			)}
		</>
	);
};
