import { Button, Drawer, Space } from 'antd';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature } from '@/models/feature';
import { FeatureEditPanel } from '@/components/panels/edit/feature-edit/feature-edit-panel';
import { FeatureLogic } from '@/logic/feature-logic';
import { FeatureType } from '@/enums/feature-type';
import { FeatureTypeSelectModal } from '@/components/modals/select/feature-type-select/feature-type-select-modal';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { PlusOutlined } from '@ant-design/icons';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './feature-list-edit-panel.scss';

interface Props {
	title: string;
	features: Feature[];
	allowedTypes?: FeatureType[];
	sourcebooks: Sourcebook[];
	onChange: (features: Feature[]) => void;
}

export const FeatureListEditPanel = (props: Props) => {
	const [ features, setFeatures ] = useState(Utils.copy(props.features));
	const [ typeSelectorVisible, setTypeSelectorVisible ] = useState<boolean>(false);

	const addFeature = (type: FeatureType) => {
		const f = {
			id: Utils.guid(),
			name: type,
			description: '',
			type: type,
			data: FeatureLogic.getFeatureData(type)
		} as Feature;

		const copy = Utils.copy(features);
		copy.push(f);
		setFeatures(copy);
		props.onChange(copy);
	};

	const changeFeature = (feature: Feature) => {
		const copy = Utils.copy(features);
		const index = copy.findIndex(f => f.id === feature.id);
		if (index !== -1) {
			copy[index] = feature;
		}
		setFeatures(copy);
		props.onChange(copy);
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			const copy = Utils.copy(features);
			const oldIndex = copy.findIndex(f => f.id === active.id);
			const newIndex = copy.findIndex(f => f.id === over.id);
			const reordered = arrayMove(copy, oldIndex, newIndex);
			setFeatures(reordered);
			props.onChange(reordered);
		}
	};

	const deleteFeature = (feature: Feature) => {
		let copy = Utils.copy(features);
		copy = copy.filter(f => f.id !== feature.id);
		setFeatures(copy);
		props.onChange(copy);
	};

	return (
		<ErrorBoundary>
			<div className='feature-list-edit-panel'>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={() => setTypeSelectorVisible(true)} />
					}
				>
					{props.title}
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
					<SortableContext items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
						<Space orientation='vertical' style={{ width: '100%' }}>
							{
								features.map(f => (
									<DraggableExpander
										key={f.id}
										id={f.id}
										title={f.name || 'Unnamed Feature'}
										tags={[ FeatureLogic.getFeatureTag(f) ]}
										extra={[
											<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteFeature(f); }} />
										]}
									>
										<FeatureEditPanel
											feature={f}
											allowedTypes={props.allowedTypes}
											sourcebooks={props.sourcebooks}
											onChange={feature => changeFeature(feature)}
										/>
									</DraggableExpander>
								))
							}
							{
								features.length === 0 ?
									<Empty />
									: null
							}
						</Space>
					</SortableContext>
				</DndContext>
			</div>
			<Drawer open={typeSelectorVisible} onClose={() => setTypeSelectorVisible(false)} closeIcon={null} size={500}>
				<FeatureTypeSelectModal
					types={props.allowedTypes || FeatureLogic.getSelectableFeatureTypes()}
					onSelect={type => { addFeature(type); setTypeSelectorVisible(false); }}
					onClose={() => setTypeSelectorVisible(false)}
				/>
			</Drawer>
		</ErrorBoundary>
	);
};
