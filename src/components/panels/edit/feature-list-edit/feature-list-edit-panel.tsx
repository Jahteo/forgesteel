import { Button, Drawer } from 'antd';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature } from '@/models/feature';
import { FeatureEditPanel } from '@/components/panels/edit/feature-edit/feature-edit-panel';
import { FeatureLogic } from '@/logic/feature-logic';
import { FeatureType } from '@/enums/feature-type';
import { FeatureTypeSelectModal } from '@/components/modals/select/feature-type-select/feature-type-select-modal';
import { GroupedItemList } from '@/components/controls/grouped-item-list/grouped-item-list';
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

		const copy = [ ...Utils.copy(features), f ];
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

	const deleteFeature = (feature: Feature) => {
		const copy = features.filter(f => f.id !== feature.id);
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
				<GroupedItemList
					items={features}
					renderTitle={f => f.name || 'Unnamed Feature'}
					renderTags={f => [ FeatureLogic.getFeatureTag(f) ]}
					renderExtra={f => [
						<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteFeature(f); }} />
					]}
					renderContent={f => (
						<FeatureEditPanel
							feature={f}
							allowedTypes={props.allowedTypes}
							sourcebooks={props.sourcebooks}
							onChange={changeFeature}
						/>
					)}
					onChange={updated => {
						setFeatures(updated);
						props.onChange(updated);
					}}
				/>
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
