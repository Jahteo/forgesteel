import { Alert, Button, Flex, Space, Upload } from 'antd';
import { Backup, BackupLogic } from '@/logic/backup-logic';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { BackupContentsTree } from '@/components/panels/backup/backup-contents-tree';
import { ConnectionSettings } from '@/models/connection-settings';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DataService } from '@/services/data-service';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

interface Props {
	dataService: DataService;
	connectionSettings: ConnectionSettings;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Export everything to a single backup file, or restore everything from one.
 */
export const BackupRestorePanel = (props: Props) => {
	const [ exporting, setExporting ] = useState<boolean>(false);
	const [ exportedBackup, setExportedBackup ] = useState<Backup | null>(null);
	const [ pendingBackup, setPendingBackup ] = useState<Backup | null>(null);
	const [ restoring, setRestoring ] = useState<boolean>(false);
	const [ error, setError ] = useState<string | null>(null);

	const usingCloud = props.connectionSettings.useManualWarehouse || props.connectionSettings.usePatreonWarehouse;

	const exportBackup = () => {
		setExporting(true);
		setError(null);
		setExportedBackup(null);
		setPendingBackup(null);
		BackupLogic.createBackup(props.dataService)
			.then(backup => {
				Utils.exportData(BackupLogic.getBackupFileName(), backup, 'backup');
				setExportedBackup(backup);
			})
			.catch(err => {
				console.error(err);
				setError(`The backup couldn't be created: ${Utils.getErrorMessage(err)}`);
			})
			.finally(() => setExporting(false));
	};

	const restoreBackup = (backup: Backup) => {
		setRestoring(true);
		setError(null);
		BackupLogic.restoreBackup(backup, props.dataService)
			// Reload so the restored data is loaded (and updated) exactly as it would be on startup
			.then(() => window.location.reload())
			.catch(err => {
				console.error(err);
				setError(`The backup couldn't be fully restored: ${Utils.getErrorMessage(err)}. Some of your data may have been replaced; reload the app to see what's there now.`);
				setRestoring(false);
			});
	};

	const getPendingBackup = () => {
		if (!pendingBackup) {
			return null;
		}

		const summary = BackupLogic.summarize(pendingBackup);
		const created = new Date(pendingBackup.created);

		return (
			<Alert
				type='warning'
				showIcon={true}
				title={`Backup from ${isNaN(created.getTime()) ? 'an unknown date' : created.toLocaleString()}`}
				description={
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text'>
							Contains {plural(summary.heroes, 'hero', 'heroes')}, {plural(summary.homebrewSourcebooks, 'homebrew sourcebook', 'homebrew sourcebooks')}, and {plural(summary.sessionItems, 'session item', 'session items')}, plus your settings.
						</div>
						<BackupContentsTree backup={pendingBackup} />
						<div className='ds-text'>
							Restoring <b>replaces everything you currently have</b> with the contents of this backup. Heroes and sourcebooks that aren't in the backup will be deleted.
						</div>
						<Flex gap={10}>
							<DangerButton
								mode='block'
								label='Replace My Data'
								icon={<UploadOutlined />}
								disabled={restoring}
								message={<div className='ds-text'>This replaces all your current data and reloads the app. Are you sure?</div>}
								onConfirm={() => restoreBackup(pendingBackup)}
							/>
							<Button block={true} disabled={restoring} onClick={() => setPendingBackup(null)}>Cancel</Button>
						</Flex>
					</Space>
				}
			/>
		);
	};

	const getExportedBackup = () => {
		if (!exportedBackup) {
			return null;
		}

		return (
			<Alert
				type='success'
				showIcon={true}
				title={`Saved ${BackupLogic.getBackupFileName(new Date(exportedBackup.created))}.ds-backup`}
				closable={{ onClose: () => setExportedBackup(null) }}
				description={
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text'>This backup contains:</div>
						<BackupContentsTree backup={exportedBackup} />
					</Space>
				}
			/>
		);
	};

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				Save everything - your heroes, homebrew sourcebooks, session, and settings - to a single backup file, or restore from one.
				{usingCloud ? ' Because you are using a cloud connection, restoring a backup also replaces your data in the cloud.' : ''}
			</div>
			<Button block={true} icon={<DownloadOutlined />} loading={exporting} onClick={exportBackup}>
				Export Everything
			</Button>
			<Upload
				style={{ width: '100%' }}
				accept='.ds-backup'
				showUploadList={false}
				disabled={restoring}
				beforeUpload={file => {
					setError(null);
					setExportedBackup(null);
					setPendingBackup(null);
					file
						.text()
						.then(json => setPendingBackup(BackupLogic.parseBackup(json)))
						.catch(err => setError(Utils.getErrorMessage(err)));
					return false;
				}}
			>
				<Button block={true} icon={<UploadOutlined />} disabled={restoring}>
					Import Everything...
				</Button>
			</Upload>
			{getExportedBackup()}
			{getPendingBackup()}
			{
				error ?
					<Alert type='error' showIcon={true} title={error} />
					: null
			}
		</Space>
	);
};
