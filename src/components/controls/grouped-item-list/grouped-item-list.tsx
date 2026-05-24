import { Button, Input, Select } from 'antd';
import { CSS } from '@dnd-kit/utilities';
import { CheckOutlined, CloseOutlined, EditOutlined, FolderOutlined, HolderOutlined } from '@ant-design/icons';
import { CSSProperties, MouseEvent, ReactNode, useState } from 'react';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';

import './grouped-item-list.scss';

const GROUP_PREFIX = 'grp::';
const toGroupDndId = (name: string) => `${GROUP_PREFIX}${name}`;

function computeGroups<T extends { group?: string }>(items: T[]): { name: string | null; items: T[] }[] {
	const result: { name: string | null; items: T[] }[] = [];
	const seen = new Map<string | null, number>();
	for (const item of items) {
		const g = item.group ?? null;
		if (!seen.has(g)) {
			seen.set(g, result.length);
			result.push({ name: g, items: [] });
		}
		result[seen.get(g)!].items.push(item);
	}
	return result;
}

function flattenGroups<T>(groups: { name: string | null; items: T[] }[]): T[] {
	return groups.flatMap(g => g.items);
}

interface GroupHeaderProps {
	id: string;
	name: string;
	isExpanded: boolean;
	onToggle: () => void;
	onRename: (newName: string) => void;
	onDelete: (e: MouseEvent) => void;
}

const SortableGroupHeader = (props: GroupHeaderProps) => {
	const [ editing, setEditing ] = useState(false);
	const [ editName, setEditName ] = useState(props.name);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const startEdit = (e: MouseEvent) => {
		e.stopPropagation();
		setEditName(props.name);
		setEditing(true);
	};

	const commit = () => {
		const trimmed = editName.trim();
		if (trimmed && trimmed !== props.name) {
			props.onRename(trimmed);
		}
		setEditing(false);
	};

	const cancel = (e: MouseEvent) => {
		e.stopPropagation();
		setEditing(false);
	};

	return (
		<div ref={setNodeRef} style={style} className='group-header' onClick={props.onToggle}>
			<Button
				type='text'
				className='drag-handle'
				icon={<HolderOutlined />}
				onClick={e => e.stopPropagation()}
				{...attributes}
				{...listeners}
			/>
			<FolderOutlined className='group-icon' />
			{editing ? (
				<div className='group-name-editor' onClick={e => e.stopPropagation()}>
					<Input
						autoFocus={true}
						size='small'
						value={editName}
						onChange={e => setEditName(e.target.value)}
						onPressEnter={commit}
						onBlur={commit}
					/>
					<Button type='text' size='small' icon={<CheckOutlined />} onClick={commit} />
					<Button type='text' size='small' icon={<CloseOutlined />} onClick={cancel} />
				</div>
			) : (
				<>
					<span className='group-name'>{props.name}</span>
					<Button type='text' size='small' icon={<EditOutlined />} onClick={startEdit} />
				</>
			)}
			<div className='group-header-spacer' />
			<DangerButton mode='clear' onConfirm={props.onDelete} />
		</div>
	);
};

export interface GroupedItemListProps<T extends { id: string; group?: string }> {
	items: T[];
	renderTitle: (item: T) => ReactNode;
	renderTags?: (item: T) => string[];
	renderExtra?: (item: T) => ReactNode[];
	renderContent: (item: T) => ReactNode;
	onChange: (items: T[]) => void;
}

export const GroupedItemList = <T extends { id: string; group?: string }>(props: GroupedItemListProps<T>) => {
	const [ collapsedGroups, setCollapsedGroups ] = useState<Set<string>>(new Set());
	const [ groupSearch, setGroupSearch ] = useState('');

	const allGroups = computeGroups(props.items);
	const namedGroups = allGroups.filter(g => g.name !== null) as { name: string; items: T[] }[];

	const toggleGroup = (name: string) => {
		setCollapsedGroups(prev => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	const assignGroup = (itemId: string, groupName: string | null) => {
		const item = props.items.find(i => i.id === itemId)!;
		const updated: T = groupName
			? ({ ...item, group: groupName } as T)
			: ({ ...item, group: undefined } as T);
		const others = props.items.filter(i => i.id !== itemId);

		if (!groupName) {
			props.onChange([ ...others, updated ]);
			return;
		}

		const currentGroups = computeGroups(others);
		const target = currentGroups.find(g => g.name === groupName);
		if (target) {
			target.items.push(updated);
		} else {
			currentGroups.push({ name: groupName, items: [ updated ] });
		}
		setCollapsedGroups(prev => {
			const next = new Set(prev);
			next.delete(groupName);
			return next;
		});
		props.onChange(flattenGroups(currentGroups));
	};

	const renameGroup = (oldName: string, newName: string) => {
		if (namedGroups.find(g => g.name === newName)) return;
		const updated = props.items.map(item =>
			item.group === oldName ? ({ ...item, group: newName } as T) : item
		);
		setCollapsedGroups(prev => {
			const next = new Set(prev);
			if (next.has(oldName)) {
				next.delete(oldName);
				next.add(newName);
			}
			return next;
		});
		props.onChange(updated);
	};

	const deleteGroup = (name: string) => {
		const updated = props.items.map(item =>
			item.group === name ? ({ ...item, group: undefined } as T) : item
		);
		props.onChange(updated);
	};

	const onDragEndGroups = (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			const currentGroups = computeGroups(props.items);
			const named = currentGroups.filter(g => g.name !== null);
			const ungrouped = currentGroups.find(g => g.name === null);
			const oldIdx = named.findIndex(g => toGroupDndId(g.name!) === String(active.id));
			const newIdx = named.findIndex(g => toGroupDndId(g.name!) === String(over.id));
			if (oldIdx !== -1 && newIdx !== -1) {
				const reordered = arrayMove(named, oldIdx, newIdx);
				props.onChange(flattenGroups(ungrouped ? [ ...reordered, ungrouped ] : reordered));
			}
		}
	};

	const onDragEndItems = (groupName: string | null) => (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			const currentGroups = computeGroups(props.items);
			const target = currentGroups.find(g => g.name === groupName);
			if (target) {
				const oldIdx = target.items.findIndex(i => i.id === String(active.id));
				const newIdx = target.items.findIndex(i => i.id === String(over.id));
				if (oldIdx !== -1 && newIdx !== -1) {
					target.items = arrayMove(target.items, oldIdx, newIdx);
					props.onChange(flattenGroups(currentGroups));
				}
			}
		}
	};

	const groupSelectOptions = [
		{ value: '__none__', label: 'No group' },
		...namedGroups.map(g => ({ value: g.name, label: g.name }))
	];

	const renderItemGroupSelect = (item: T) => (
		<div
			key='group-select'
			className='group-select-wrapper'
			onMouseDown={e => e.stopPropagation()}
			onClick={e => e.stopPropagation()}
		>
			<Select
				size='small'
				value={item.group ?? '__none__'}
				style={{ minWidth: 90 }}
				options={groupSelectOptions}
				showSearch={true}
				filterOption={(input, option) =>
					option?.label?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
				}
				onSearch={setGroupSearch}
				dropdownRender={menu => (
					<>
						{menu}
						{groupSearch.trim() && !namedGroups.find(g => g.name === groupSearch.trim()) && (
							<div
								className='create-group-row'
								onMouseDown={e => e.preventDefault()}
								onClick={() => {
									const name = groupSearch.trim();
									assignGroup(item.id, name);
									setGroupSearch('');
								}}
							>
								Create group &quot;{groupSearch.trim()}&quot;
							</div>
						)}
					</>
				)}
				onChange={value => assignGroup(item.id, value === '__none__' ? null : value)}
			/>
		</div>
	);

	const renderGroupItems = (group: { name: string | null; items: T[] }) => {
		if (group.items.length === 0) return null;
		return (
			<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndItems(group.name)}>
				<SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
					{group.items.map(item => (
						<DraggableExpander
							key={item.id}
							id={item.id}
							title={props.renderTitle(item)}
							tags={props.renderTags?.(item)}
							extra={[
								renderItemGroupSelect(item),
								...(props.renderExtra?.(item) ?? [])
							]}
						>
							{props.renderContent(item)}
						</DraggableExpander>
					))}
				</SortableContext>
			</DndContext>
		);
	};

	if (props.items.length === 0) {
		return <Empty />;
	}

	return (
		<div className='grouped-item-list'>
			<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndGroups}>
				<SortableContext
					items={namedGroups.map(g => toGroupDndId(g.name))}
					strategy={verticalListSortingStrategy}
				>
					{allGroups.map(group => (
						<div key={group.name ?? '__ungrouped__'} className={group.name ? 'group-container' : 'ungrouped-container'}>
							{group.name !== null && (
								<SortableGroupHeader
									id={toGroupDndId(group.name)}
									name={group.name}
									isExpanded={!collapsedGroups.has(group.name)}
									onToggle={() => toggleGroup(group.name!)}
									onRename={newName => renameGroup(group.name!, newName)}
									onDelete={e => { e.stopPropagation(); deleteGroup(group.name!); }}
								/>
							)}
							{(group.name === null || !collapsedGroups.has(group.name)) && (
								<div className={group.name ? 'group-items' : ''}>
									{renderGroupItems(group)}
								</div>
							)}
						</div>
					))}
				</SortableContext>
			</DndContext>
		</div>
	);
};
