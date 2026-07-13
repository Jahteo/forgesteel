import { Alert, Button, Flex, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface Props {
	open: boolean;
	itemType: string;
	itemName: string;
	sourceLabel: 'Local' | 'Supabase';
	targetLabel: 'Local' | 'Supabase';
	sourceTimestamp: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmOverrideModal = (props: Props) => {
	const sourceTime = props.sourceTimestamp
		? new Date(props.sourceTimestamp).toLocaleString()
		: 'unknown time';

	return (
		<Modal
			open={props.open}
			title={
				<Flex gap='small' align='center'>
					<ExclamationCircleOutlined style={{ color: '#faad14' }} />
					<span>Override {props.targetLabel} {props.itemType}?</span>
				</Flex>
			}
			onCancel={props.onCancel}
			footer={
				<Flex gap='small' justify='flex-end'>
					<Button onClick={props.onCancel}>Cancel</Button>
					<Button type='primary' danger onClick={props.onConfirm}>
						Override & Continue
					</Button>
				</Flex>
			}
		>
			<Flex vertical gap='small'>
				<p>
					<strong>{props.itemName}</strong> will be replaced in <strong>{props.targetLabel}</strong> with
					the <strong>{props.sourceLabel}</strong> version (last modified: {sourceTime}).
				</p>
				<Alert
					type='info'
					showIcon
					message='A backup of the version being replaced is saved automatically. You can restore it anytime from Backup History in Connection Settings.'
				/>
			</Flex>
		</Modal>
	);
};
