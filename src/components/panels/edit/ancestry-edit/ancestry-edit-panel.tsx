import { Button, Segmented, Space, Tabs } from 'antd';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Feature, FeatureChoice } from '@/models/feature';
import { Ancestry } from '@/models/ancestry';
import { AncestryLogic } from '@/logic/ancestry-logic';
import { AncestryPanel } from '@/components/panels/elements/ancestry-panel/ancestry-panel';
import { Collections } from '@/utils/collections';
import { Culture } from '@/models/culture';
import { CultureEditPanel } from '@/components/panels/edit/culture-edit/culture-edit-panel';
import { CultureType } from '@/enums/culture-type';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { PlusOutlined } from '@ant-design/icons';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeatureEditPanel } from '@/components/panels/edit/feature-edit/feature-edit-panel';
import { FeatureLogic } from '@/logic/feature-logic';
import { FeaturePanel } from '@/components/panels/elements/feature-panel/feature-panel';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { SearchBox } from '@/components/controls/text-input/text-input';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './ancestry-edit-panel.scss';

interface Props {
	ancestry: Ancestry;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	onChange: (ancestry: Ancestry) => void;
}

export const AncestryEditPanel = (props: Props) => {
	const [ ancestry, setAncestry ] = useState<Ancestry>(props.ancestry);
	const [ featureCost, setFeatureCost ] = useState<number>(0);
	const [ featureSearch, setFeatureSearch ] = useState<string>('');

	const getNameAndDescriptionSection = () => {
		const onChange = (name: string, desc: string) => {
			const copy = Utils.copy(ancestry);
			copy.name = name;
			copy.description = desc;
			setAncestry(copy);
			props.onChange(copy);
		};

		return (
			<NameDescEditPanel
				element={ancestry}
				showNameGenerator={true}
				onChange={onChange}
			/>
		);
	};

	const getSignatureEditSection = () => {
		const addFeature = () => {
			const copy = Utils.copy(ancestry);
			copy.features.push(FactoryLogic.feature.create({
				id: Utils.guid(),
				name: '',
				description: ''
			}));
			setAncestry(copy);
			props.onChange(copy);
		};

		const changeFeature = (feature: Feature) => {
			const copy = Utils.copy(ancestry);
			const index = copy.features.findIndex(f => f.id === feature.id);
			if (index !== -1) {
				copy.features[index] = feature;
			}
			setAncestry(copy);
			props.onChange(copy);
		};

		const onDragEnd = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(ancestry);
				const oldIndex = copy.features.findIndex(f => f.id === active.id);
				const newIndex = copy.features.findIndex(f => f.id === over.id);
				copy.features = arrayMove(copy.features, oldIndex, newIndex);
				setAncestry(copy);
				props.onChange(copy);
			}
		};

		const deleteFeature = (feature: Feature) => {
			const copy = Utils.copy(ancestry);
			copy.features = copy.features.filter(f => f.id !== feature.id);
			setAncestry(copy);
			props.onChange(copy);
		};

		const features = AncestryLogic.getSignatureFeatures(ancestry);

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addFeature} />
					}
				>
					Signature Traits
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
					<SortableContext items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
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
										sourcebooks={props.sourcebooks}
										onChange={changeFeature}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					features.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	const getPurchasedEditSection = () => {
		const choiceFeature = ancestry.features.find(AncestryLogic.isPurchasedFeature);
		if (!choiceFeature) {
			return null;
		}

		const setAncestryPoints = (value: number) => {
			const copy = Utils.copy(ancestry);
			copy.ancestryPoints = value;
			setAncestry(copy);
			props.onChange(copy);
		};

		const addFeature = () => {
			const copy = Utils.copy(ancestry);
			const choice = copy.features.find(f => f.id === choiceFeature.id);
			if (choice) {
				(choice as FeatureChoice).data.options.push({
					feature: FactoryLogic.feature.create({
						id: Utils.guid(),
						name: '',
						description: ''
					}),
					value: 1
				});
				setAncestry(copy);
				props.onChange(copy);
			}
		};

		const changeFeature = (f: { feature: Feature, value: number }) => {
			const copy = Utils.copy(ancestry);
			const choice = copy.features.find(x => x.id === choiceFeature.id);
			if (choice) {
				const index = (choice as FeatureChoice).data.options.findIndex(x => x.feature.id === f.feature.id);
				if (index !== -1) {
					(choice as FeatureChoice).data.options[index] = f;
				}
				setAncestry(copy);
				props.onChange(copy);
			}
		};

		const onDragEndPurchased = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(ancestry);
				const choice = copy.features.find(x => x.id === choiceFeature.id);
				if (choice) {
					const oldIndex = (choice as FeatureChoice).data.options.findIndex(f => f.feature.id === active.id);
					const newIndex = (choice as FeatureChoice).data.options.findIndex(f => f.feature.id === over.id);
					(choice as FeatureChoice).data.options = arrayMove((choice as FeatureChoice).data.options, oldIndex, newIndex);
					setAncestry(copy);
					props.onChange(copy);
				}
			}
		};

		const deleteFeature = (featureID: string) => {
			const copy = Utils.copy(ancestry);
			const choice = copy.features.find(x => x.id === choiceFeature.id);
			if (choice) {
				(choice as FeatureChoice).data.options = (choice as FeatureChoice).data.options.filter(f => f.feature.id !== featureID);
				setAncestry(copy);
				props.onChange(copy);
			}
		};

		const features = AncestryLogic.getPurchasedFeatures(ancestry);

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText>Ancestry Points</HeaderText>
				<NumberSpin min={1} value={ancestry.ancestryPoints} onChange={setAncestryPoints} />
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addFeature} />
					}
				>
					Purchased Traits
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndPurchased}>
					<SortableContext items={features.map(f => f.feature.id)} strategy={verticalListSortingStrategy}>
						{
							features.map(f => (
								<DraggableExpander
									key={f.feature.id}
									id={f.feature.id}
									title={f.feature.name || 'Unnamed Feature'}
									tags={[ FeatureLogic.getFeatureTag(f.feature) ]}
									extra={[
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteFeature(f.feature.id); }} />
									]}
								>
									<HeaderText>Cost</HeaderText>
									<NumberSpin min={1} max={2} value={f.value} onChange={v => changeFeature({ feature: f.feature, value: v })} />
									<FeatureEditPanel
										feature={f.feature}
										sourcebooks={props.sourcebooks}
										onChange={x => changeFeature({ feature: x, value: f.value })}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					features.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	const getCultureEditSection = () => {
		const setHasCulture = (value: boolean) => {
			const copy = Utils.copy(ancestry);
			copy.culture = value ? FactoryLogic.createCulture(ancestry.name, '', CultureType.Ancestral) : undefined;
			setAncestry(copy);
			props.onChange(copy);
		};

		const setCulture = (value: Culture) => {
			const copy = Utils.copy(ancestry);
			copy.culture = value;
			setAncestry(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText>Culture</HeaderText>
				<Toggle label='Include a culture' value={!!ancestry.culture} onChange={setHasCulture} />
				{
					ancestry.culture ?
						<CultureEditPanel culture={ancestry.culture} sourcebooks={props.sourcebooks} onChange={setCulture} />
						: null
				}
			</Space>
		);
	};

	const getCherryPick = () => {
		const cherryPick = (feature: Feature, value: number) => {
			const copy = Utils.copy(ancestry);
			const featureCopy = Utils.copy(feature);
			featureCopy.id = Utils.guid();
			if (value === 0) {
				// Signature
				copy.features.push(featureCopy);
			} else {
				// Purchased
				const f = copy.features.find(AncestryLogic.isPurchasedFeature);
				if (f) {
					(f as FeatureChoice).data.options.push({ feature: featureCopy, value: value });
				}
			}
			setAncestry(copy);
			props.onChange(copy);
		};

		const currentFeatureNames = [
			...AncestryLogic.getSignatureFeatures(ancestry).map(f => f.name),
			...AncestryLogic.getPurchasedFeatures(ancestry).map(f => f.feature.name)
		];

		const availableSignatureFeatures = SourcebookLogic.getAncestries(props.sourcebooks).flatMap(AncestryLogic.getSignatureFeatures).filter(f => !currentFeatureNames.includes(f.name)).map(f => ({ feature: f, value: 0 }));
		const availablePurchasedFeatures = SourcebookLogic.getAncestries(props.sourcebooks).flatMap(AncestryLogic.getPurchasedFeatures).filter(f => !currentFeatureNames.includes(f.feature.name));

		const features = Collections.sort(
			Collections.distinct(
				[
					...availableSignatureFeatures,
					...availablePurchasedFeatures
				],
				f => f.feature.name
			),
			f => f.feature.name
		);

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<Segmented
					block={true}
					options={[
						{ value: 0, label: 'Signature' },
						{ value: 1, label: '1pt' },
						{ value: 2, label: '2pt' }
					]}
					value={featureCost}
					onChange={setFeatureCost}
				/>
				<SearchBox searchTerm={featureSearch} setSearchTerm={setFeatureSearch} />
				{
					features
						.filter(f => f.value === featureCost)
						.filter(f => Utils.textMatches([ f.feature.name ], featureSearch))
						.map(f => (
							<SelectablePanel
								key={f.feature.id}
								action={
									<Button
										onClick={e => {
											e.stopPropagation();
											cherryPick(f.feature, f.value);
										}}
									>
										Import
									</Button>
								}
							>
								<FeaturePanel
									feature={f.feature}
									cost={f.value || 'signature'}
									sourcebooks={props.sourcebooks}
									mode={PanelMode.Full}
								/>
							</SelectablePanel>
						))
				}
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<div className='ancestry-edit-panel'>
				<div className='ancestry-workspace-column'>
					<Tabs
						items={[
							{
								key: '1',
								label: 'Ancestry',
								children: getNameAndDescriptionSection()
							},
							{
								key: '2',
								label: 'Signature Traits',
								children: getSignatureEditSection()
							},
							{
								key: '3',
								label: 'Purchased Traits',
								children: getPurchasedEditSection()
							},
							{
								key: '4',
								label: 'Culture',
								children: getCultureEditSection()
							}
						]}
					/>
				</div>
				{
					props.mode === PanelMode.Full ?
						<div className='ancestry-preview-column'>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Preview',
										children: (
											<SelectablePanel>
												<AncestryPanel
													ancestry={ancestry}
													sourcebooks={props.sourcebooks}
													mode={PanelMode.Full}
												/>
											</SelectablePanel>
										)
									},
									{
										key: '2',
										label: 'Cherry Pick',
										children: getCherryPick()
									}
								]}
							/>
						</div>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
