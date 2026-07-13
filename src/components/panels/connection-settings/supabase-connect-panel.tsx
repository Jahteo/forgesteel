import { Alert, Button, ColorPicker, Flex, Input, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloudOutlined, HistoryOutlined, LogoutOutlined, MailOutlined, SyncOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { BackupHistoryModal } from '@/components/modals/backup-history/backup-history-modal';
import { BackupService } from '@/services/backup/backup-service';
import { ConnectionSettings } from '@/models/connection-settings';
import { Hero } from '@/models/hero';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { HeroSyncModal } from '@/components/modals/hero-sync/hero-sync-modal';
import { SupabaseAuthService } from '@/services/auth/supabase-auth-service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/services/storage/supabase-service';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Toggle } from '@/components/controls/toggle/toggle';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/models/campaign';
import { Utils } from '@/utils/utils';

interface Props {
	connectionSettings: ConnectionSettings;
	supabaseClient: SupabaseClient | null;
	userProfile: UserProfile | null;
	localHeroes: Hero[];
	backupService: BackupService | null;
	onSettingsChange: (settings: ConnectionSettings) => void;
	onUserProfileChange: (profile: UserProfile) => void;
	onLocalHeroSaved: (hero: Hero) => void;
	onSignedOut: () => void;
}

export const SupabaseConnectPanel = (props: Props) => {
	const [ settings, setSettings ] = useState<ConnectionSettings>(Utils.copy(props.connectionSettings));
	const [ currentUser, setCurrentUser ] = useState<User | null>(null);
	const [ email, setEmail ] = useState('');
	const [ magicLinkSent, setMagicLinkSent ] = useState(false);
	const [ sending, setSending ] = useState(false);
	const [ showSyncModal, setShowSyncModal ] = useState(false);
	const [ showBackupModal, setShowBackupModal ] = useState(false);
	const [ error, setError ] = useState<string | null>(null);

	useEffect(() => {
		if (props.supabaseClient) {
			const authSvc = new SupabaseAuthService(props.supabaseClient);
			authSvc.getUser().then(user => setCurrentUser(user));
		} else {
			setCurrentUser(null);
		}
	}, [ props.supabaseClient ]);

	const setField = (field: keyof ConnectionSettings, value: unknown) => {
		const copy = Utils.copy(settings);
		(copy as Record<string, unknown>)[field] = value;
		setSettings(copy);
		props.onSettingsChange(copy);
	};

	const sendMagicLink = async () => {
		if (!props.supabaseClient || !email) return;
		setSending(true);
		setError(null);
		try {
			const authSvc = new SupabaseAuthService(props.supabaseClient);
			await authSvc.signInWithEmail(email);
			setMagicLinkSent(true);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSending(false);
		}
	};

	const signOut = async () => {
		if (!props.supabaseClient) return;
		const authSvc = new SupabaseAuthService(props.supabaseClient);
		await authSvc.signOut();
		setCurrentUser(null);
		props.onSignedOut();
	};

	const updateAvatarColor = (color: string) => {
		if (!props.userProfile) return;
		props.onUserProfileChange({ ...props.userProfile, avatarColor: color });
	};

	const supabaseService = props.supabaseClient
		? new SupabaseService(props.supabaseClient)
		: null;

	return (
		<Space direction='vertical' style={{ width: '100%' }}>
			<Toggle
				label='Use Supabase for cloud backup & multiplayer'
				value={settings.useSupabase}
				onChange={v => setField('useSupabase', v)}
			/>

			{settings.useSupabase && (
				<>
					<HeaderText>Supabase Project URL</HeaderText>
					<TextInput
						placeholder='https://your-project.supabase.co'
						value={settings.supabaseUrl}
						onChange={v => setField('supabaseUrl', v)}
					/>

					<HeaderText>Supabase Anon Key</HeaderText>
					<Input.Password
						placeholder='your-anon-key'
						value={settings.supabaseAnonKey}
						onChange={e => setField('supabaseAnonKey', e.target.value)}
					/>

					{currentUser ? (
						<>
							<Flex align='center' gap='small'>
								<CheckCircleOutlined style={{ color: '#52c41a' }} />
								<Typography.Text>Signed in as <Tag color='blue'>{currentUser.email}</Tag></Typography.Text>
							</Flex>

							{props.userProfile && (
								<Flex align='center' gap='small'>
									<Typography.Text>Cursor color:</Typography.Text>
									<ColorPicker
										value={props.userProfile.avatarColor}
										onChange={(_, hex) => updateAvatarColor(hex)}
										size='small'
									/>
								</Flex>
							)}

							<Flex gap='small' wrap>
								<Button
									icon={<SyncOutlined />}
									onClick={() => setShowSyncModal(true)}
									disabled={!supabaseService}
								>
									Sync Heroes
								</Button>
								<Button
									icon={<HistoryOutlined />}
									onClick={() => setShowBackupModal(true)}
									disabled={!props.backupService}
								>
									Backup History
								</Button>
								<Button
									icon={<LogoutOutlined />}
									danger
									onClick={signOut}
								>
									Sign Out
								</Button>
							</Flex>
						</>
					) : (
						<>
							{magicLinkSent ? (
								<Alert
									type='success'
									showIcon
									icon={<MailOutlined />}
									message='Check your email for a magic link to sign in.'
								/>
							) : (
								<Flex gap='small'>
									<Input
										placeholder='your@email.com'
										type='email'
										value={email}
										onChange={e => setEmail(e.target.value)}
										onPressEnter={sendMagicLink}
										style={{ flex: 1 }}
									/>
									<Button
										type='primary'
										icon={<CloudOutlined />}
										loading={sending}
										onClick={sendMagicLink}
										disabled={!settings.supabaseUrl || !settings.supabaseAnonKey || !email}
									>
										Send Magic Link
									</Button>
								</Flex>
							)}
							{error && <Alert type='error' showIcon message={error} />}
						</>
					)}
				</>
			)}

			{showSyncModal && supabaseService && props.backupService && (
				<HeroSyncModal
					open={true}
					localHeroes={props.localHeroes}
					supabaseService={supabaseService}
					backupService={props.backupService}
					mode='sync'
					onLocalHeroSaved={props.onLocalHeroSaved}
					onClose={() => setShowSyncModal(false)}
				/>
			)}

			{showBackupModal && props.backupService && (
				<BackupHistoryModal
					open={true}
					backupService={props.backupService}
					onRestore={async (data, dataType, dataId) => {
						if (dataType === 'hero') props.onLocalHeroSaved(data as Hero);
						console.log('Restored backup', dataType, dataId);
					}}
					onClose={() => setShowBackupModal(false)}
				/>
			)}
		</Space>
	);
};
