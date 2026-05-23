import { CSS } from '@dnd-kit/utilities';
import { CSSProperties, ReactNode } from 'react';
import { Expander } from '@/components/controls/expander/expander';
import { HolderOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useSortable } from '@dnd-kit/sortable';

import './draggable-expander.scss';

interface Props {
	id: string;
	title: ReactNode;
	tags?: string[];
	extra?: ReactNode[];
	expandedByDefault?: boolean;
	style?: CSSProperties;
	children: ReactNode;
}

export const DraggableExpander = (props: Props) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: props.id });

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		position: 'relative',
		zIndex: isDragging ? 1 : undefined
	};

	const dragHandle = (
		<Button
			key='drag-handle'
			type='text'
			className='drag-handle'
			icon={<HolderOutlined />}
			title='Drag to reorder'
			{...attributes}
			{...listeners}
		/>
	);

	return (
		<div ref={setNodeRef} style={style}>
			<Expander
				title={props.title}
				tags={props.tags}
				extra={[ dragHandle, ...(props.extra ?? []) ]}
				expandedByDefault={props.expandedByDefault}
				style={props.style}
			>
				{props.children}
			</Expander>
		</div>
	);
};
