import { Alert, Button, Space, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { BackupLogic } from '@/logic/backup-logic';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Session } from '@/models/session';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

interface Props {
	session: Session;
	importSession: (session: Session) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Export the director's session to a file, or replace it with one loaded from a file.
 */
export const SessionFilePanel = (props: Props) => {
	const [ pendingSession, setPendingSession ] = useState<Session | null>(null);
	const [ error, setError ] = useState<string | null>(null);
	const [ imported, setImported ] = useState<boolean>(false);

	const itemCount = BackupLogic.countSessionItems(props.session);

	return (
		<Space orientation='vertical' style={{ width: '100%' }}>
			<div className='ds-text'>
				Save the session (every encounter, montage, negotiation, map and counter in it, as they are now) to a file, or load a session from one.
			</div>
			<Button
				block={true}
				icon={<DownloadOutlined />}
				disabled={itemCount === 0}
				onClick={() => Utils.exportData(`Session ${new Date().toISOString().substring(0, 10)}`, props.session, 'session')}
			>
				Export Session
			</Button>
			<Upload
				style={{ width: '100%' }}
				accept='.ds-session'
				showUploadList={false}
				beforeUpload={file => {
					setError(null);
					setImported(false);
					setPendingSession(null);
					file
						.text()
						.then(json => setPendingSession(BackupLogic.parseSession(json)))
						.catch(err => setError(Utils.getErrorMessage(err)));
					return false;
				}}
			>
				<Button block={true} icon={<UploadOutlined />}>
					Import Session...
				</Button>
			</Upload>
			{
				pendingSession ?
					<Alert
						type='warning'
						showIcon={true}
						title={`This file has ${plural(BackupLogic.countSessionItems(pendingSession), 'item', 'items')}`}
						description={
							<Space orientation='vertical' style={{ width: '100%' }}>
								<div className='ds-text'>
									Loading it <b>replaces your current session</b>{itemCount > 0 ? ` (${plural(itemCount, 'item', 'items')})` : ''}.
								</div>
								<DangerButton
									mode='block'
									label='Replace Session'
									icon={<UploadOutlined />}
									message={<div className='ds-text'>Your current session will be replaced. Are you sure?</div>}
									onConfirm={() => {
										props.importSession(pendingSession);
										setPendingSession(null);
										setImported(true);
									}}
								/>
								<Button block={true} onClick={() => setPendingSession(null)}>Cancel</Button>
							</Space>
						}
					/>
					: null
			}
			{
				imported ?
					<Alert type='success' showIcon={true} title='Session loaded.' closable={{ onClose: () => setImported(false) }} />
					: null
			}
			{
				error ?
					<Alert type='error' showIcon={true} title={error} />
					: null
			}
		</Space>
	);
};
