import { Alert, Button, Card, Flex, Input, List, Modal, Space, Tag, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { Campaign } from '@/models/campaign';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { SupabaseService } from '@/services/storage/supabase-service';
import { Utils } from '@/utils/utils';

import './campaigns-page.scss';

interface Props {
	supabaseService: SupabaseService;
	currentUserId: string;
	onJoinCampaign: (roomCode: string) => void;
}

export const CampaignsPage = (props: Props) => {
	const [ directedCampaigns, setDirectedCampaigns ] = useState<Campaign[]>([]);
	const [ enrolledCampaigns, setEnrolledCampaigns ] = useState<Campaign[]>([]);
	const [ loading, setLoading ] = useState(false);
	const [ showCreateModal, setShowCreateModal ] = useState(false);
	const [ newCampaignName, setNewCampaignName ] = useState('');
	const [ newCampaignDesc, setNewCampaignDesc ] = useState('');
	const [ creating, setCreating ] = useState(false);
	const [ copiedCode, setCopiedCode ] = useState<string | null>(null);

	const loadCampaigns = useCallback(async () => {
		setLoading(true);
		try {
			const [ directed, enrolled ] = await Promise.all([
				props.supabaseService.getCampaigns(),
				props.supabaseService.getEnrolledCampaigns()
			]);
			setDirectedCampaigns(directed);
			const enrolledFiltered = enrolled.filter(
				e => !directed.some(d => d.id === e.id)
			);
			setEnrolledCampaigns(enrolledFiltered);
		} finally {
			setLoading(false);
		}
	}, [ props.supabaseService ]);

	useEffect(() => {
		loadCampaigns();
	}, [ loadCampaigns ]);

	const createCampaign = async () => {
		if (!newCampaignName.trim()) return;
		setCreating(true);
		try {
			const roomCode = Utils.guid().slice(0, 8).toUpperCase();
			const campaign: Campaign = {
				id: '',
				roomCode,
				directorUserId: props.currentUserId,
				name: newCampaignName.trim(),
				description: newCampaignDesc.trim(),
				createdAt: new Date().toISOString()
			};
			await props.supabaseService.putCampaign(campaign);
			setShowCreateModal(false);
			setNewCampaignName('');
			setNewCampaignDesc('');
			await loadCampaigns();
		} finally {
			setCreating(false);
		}
	};

	const deleteCampaign = async (id: string) => {
		await props.supabaseService.deleteCampaign(id);
		await loadCampaigns();
	};

	const shareLink = (roomCode: string) =>
		`${window.location.origin}${window.location.pathname}#/session/player?room=${roomCode}`;

	const copyLink = (roomCode: string) => {
		navigator.clipboard.writeText(shareLink(roomCode));
		setCopiedCode(roomCode);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	return (
		<ErrorBoundary>
			<div className='campaigns-page'>
				<div className='campaigns-page-content'>
					<Space direction='vertical' style={{ width: '100%' }}>

						{/* Director campaigns */}
						<Flex justify='space-between' align='center'>
							<Typography.Title level={4} style={{ margin: 0 }}>
								<TeamOutlined /> Campaigns I Direct
							</Typography.Title>
							<Button
								type='primary'
								icon={<PlusOutlined />}
								onClick={() => setShowCreateModal(true)}
							>
								New Campaign
							</Button>
						</Flex>

						{directedCampaigns.length === 0 && !loading ? (
							<Empty text='No campaigns yet. Create one to share with your players.' />
						) : (
							<List
								loading={loading}
								dataSource={directedCampaigns}
								renderItem={campaign => (
									<List.Item>
										<Card style={{ width: '100%' }} size='small'>
											<Flex justify='space-between' align='flex-start' wrap gap='small'>
												<Flex vertical gap={4}>
													<Typography.Text strong>{campaign.name}</Typography.Text>
													{campaign.description && (
														<Typography.Text type='secondary'>{campaign.description}</Typography.Text>
													)}
													<Flex gap='small' align='center'>
														<Tag>{campaign.roomCode}</Tag>
														<Typography.Text type='secondary' style={{ fontSize: 12 }}>
															{new Date(campaign.createdAt).toLocaleDateString()}
														</Typography.Text>
													</Flex>
												</Flex>
												<Flex gap='small' wrap>
													<Button
														size='small'
														icon={<CopyOutlined />}
														onClick={() => copyLink(campaign.roomCode)}
													>
														{copiedCode === campaign.roomCode ? 'Copied!' : 'Share Link'}
													</Button>
													<Button
														size='small'
														danger
														icon={<DeleteOutlined />}
														onClick={() => deleteCampaign(campaign.id)}
													>
														Delete
													</Button>
												</Flex>
											</Flex>
										</Card>
									</List.Item>
								)}
							/>
						)}

						{/* Enrolled campaigns */}
						<Typography.Title level={4} style={{ margin: 0 }}>
							<UserOutlined /> Campaigns I'm Playing In
						</Typography.Title>

						{enrolledCampaigns.length === 0 && !loading ? (
							<Empty text="You haven't joined any campaigns. Use a director's link to join one." />
						) : (
							<List
								loading={loading}
								dataSource={enrolledCampaigns}
								renderItem={campaign => (
									<List.Item>
										<Card style={{ width: '100%' }} size='small'>
											<Flex justify='space-between' align='center' wrap gap='small'>
												<Flex vertical gap={4}>
													<Typography.Text strong>{campaign.name}</Typography.Text>
													<Tag>{campaign.roomCode}</Tag>
												</Flex>
												<Button
													type='primary'
													onClick={() => props.onJoinCampaign(campaign.roomCode)}
												>
													Join as Player
												</Button>
											</Flex>
										</Card>
									</List.Item>
								)}
							/>
						)}
					</Space>
				</div>
			</div>

			<Modal
				open={showCreateModal}
				title='Create New Campaign'
				onCancel={() => setShowCreateModal(false)}
				footer={
					<Flex gap='small' justify='flex-end'>
						<Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
						<Button
							type='primary'
							loading={creating}
							disabled={!newCampaignName.trim()}
							onClick={createCampaign}
						>
							Create
						</Button>
					</Flex>
				}
			>
				<Space direction='vertical' style={{ width: '100%' }}>
					<div>
						<Typography.Text>Campaign Name</Typography.Text>
						<Input
							placeholder='The Shadow of Valenwood'
							value={newCampaignName}
							onChange={e => setNewCampaignName(e.target.value)}
							onPressEnter={createCampaign}
						/>
					</div>
					<div>
						<Typography.Text>Description (optional)</Typography.Text>
						<Input.TextArea
							placeholder='A campaign of high adventure...'
							value={newCampaignDesc}
							onChange={e => setNewCampaignDesc(e.target.value)}
							rows={3}
						/>
					</div>
					<Alert
						type='info'
						showIcon
						message='A permanent room code is generated automatically. Share a link with your players — they only need to join once.'
					/>
				</Space>
			</Modal>
		</ErrorBoundary>
	);
};
