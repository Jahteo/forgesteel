import { Backup, BackupLogic, BackupTreeNode } from '@/logic/backup-logic';
import { Tree } from 'antd';

interface Props {
	backup: Backup;
}

/**
 * A collapsible outline of everything in a backup.
 */
export const BackupContentsTree = (props: Props) => {
	const tree = BackupLogic.getContentsTree(props.backup);

	// Open the first two levels, so hero names, session items, and each sourcebook's kinds of content show
	// straight away, while a sourcebook's (possibly long) lists of individual elements stay folded
	const expandedKeys = (nodes: BackupTreeNode[], depth: number): string[] => {
		return depth > 2 ? [] : nodes.filter(n => n.children?.length).flatMap(n => [ n.key, ...expandedKeys(n.children ?? [], depth + 1) ]);
	};

	return (
		<div className='backup-contents-tree' style={{ maxHeight: '320px', overflowY: 'auto' }}>
			<Tree
				showLine={true}
				selectable={false}
				blockNode={true}
				defaultExpandedKeys={expandedKeys(tree, 1)}
				treeData={tree}
			/>
		</div>
	);
};
