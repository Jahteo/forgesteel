import { Button, Empty, Flex, List, Modal, Select, Tag, Typography } from 'antd';
import { HistoryOutlined, UndoOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { BackupEntry } from '@/models/campaign';
import { BackupService } from '@/services/backup/backup-service';

interface Props {
	open: boolean;
	backupService: BackupService;
	onRestore: (data: unknown, dataType: string, dataId: string) => Promise<void>;
	onClose: () => void;
}

export const BackupHistoryModal = (props: Props) => {
	const [ backups, setBackups ] = useState<BackupEntry[]>([]);
	const [ filter, setFilter ] = useState<string>('all');
	const [ loading, setLoading ] = useState(false);
	const [ restoring, setRestoring ] = useState<string | null>(null);
	const [ confirmRestore, setConfirmRestore ] = useState<BackupEntry | null>(null);

	const loadBackups = useCallback(async () => {
		setLoading(true);
		try {
			const dataType = filter !== 'all' ? filter : undefined;
			const results = await props.backupService.listBackups(dataType);
			setBackups(results);
		} finally {
			setLoading(false);
		}
	}, [ props.backupService, filter ]);

	useEffect(() => {
		if (props.open) loadBackups();
	}, [ props.open, loadBackups ]);

	const handleRestore = async (entry: BackupEntry) => {
		setRestoring(entry.id);
		try {
			const data = await props.backupService.restoreBackup(entry.id);
			await props.onRestore(data, entry.dataType, entry.dataId);
		} finally {
			setRestoring(null);
			setConfirmRestore(null);
		}
	};

	const typeColor: Record<string, string> = {
		hero: 'blue',
		sourcebook: 'purple',
		session: 'orange'
	};

	return (
		<>
			<Modal
				open={props.open}
				title={
					<Flex gap='small' align='center'>
						<HistoryOutlined />
						<span>Backup History</span>
					</Flex>
				}
				onCancel={props.onClose}
				footer={<Button onClick={props.onClose}>Close</Button>}
				width={600}
			>
				<Flex vertical gap='small'>
					<Select
						value={filter}
						onChange={setFilter}
						options={[
							{ value: 'all', label: 'All types' },
							{ value: 'hero', label: 'Heroes' },
							{ value: 'sourcebook', label: 'Sourcebooks' },
							{ value: 'session', label: 'Sessions' }
						]}
						style={{ width: 200 }}
					/>
					{backups.length === 0 && !loading ? (
						<Empty description='No backups found' />
					) : (
						<List
							loading={loading}
							dataSource={backups}
							renderItem={entry => (
								<List.Item
									actions={[
										<Button
											key='restore'
											size='small'
											icon={<UndoOutlined />}
											loading={restoring === entry.id}
											onClick={() => setConfirmRestore(entry)}
										>
											Restore
										</Button>
									]}
								>
									<List.Item.Meta
										title={
											<Flex gap='small' align='center'>
												<Tag color={typeColor[entry.dataType]}>{entry.dataType}</Tag>
												<span>{entry.label || entry.dataId}</span>
											</Flex>
										}
										description={
											<Typography.Text type='secondary'>
												{new Date(entry.createdAt).toLocaleString()}
												{entry.expiresAt && ` · expires ${new Date(entry.expiresAt).toLocaleDateString()}`}
											</Typography.Text>
										}
									/>
								</List.Item>
							)}
						/>
					)}
				</Flex>
			</Modal>

			<Modal
				open={!!confirmRestore}
				title='Restore backup?'
				onCancel={() => setConfirmRestore(null)}
				footer={
					<Flex gap='small' justify='flex-end'>
						<Button onClick={() => setConfirmRestore(null)}>Cancel</Button>
						<Button
							type='primary'
							danger
							loading={!!restoring}
							onClick={() => confirmRestore && handleRestore(confirmRestore)}
						>
							Restore
						</Button>
					</Flex>
				}
			>
				<p>
					This will restore the backup from{' '}
					<strong>{confirmRestore ? new Date(confirmRestore.createdAt).toLocaleString() : ''}</strong>.
					The current version will be overwritten.
				</p>
			</Modal>
		</>
	);
};
