import { Alert, Button, Drawer, Popover, Segmented, Select, Space, Tabs, Upload } from 'antd';
import { CopyOutlined, DownloadOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Ability } from '@/models/ability';
import { AbilityEditPanel } from '@/components/panels/edit/ability-edit/ability-edit-panel';
import { Characteristic } from '@/enums/characteristic';
import { ClassPanel } from '@/components/panels/elements/class-panel/class-panel';
import { Collections } from '@/utils/collections';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FactoryLogic } from '@/logic/factory-logic';
import { Feature } from '@/models/feature';
import { FeatureListEditPanel } from '@/components/panels/edit/feature-list-edit/feature-list-edit-panel';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { HeroClass } from '@/models/class';
import { Modal } from '@/components/modals/modal/modal';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SubClass } from '@/models/subclass';
import { SubClassEditPanel } from '@/components/panels/edit/subclass-edit/subclass-edit-panel';
import { SubclassPanel } from '@/components/panels/elements/subclass-panel/subclass-panel';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Toggle } from '@/components/controls/toggle/toggle';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './class-edit-panel.scss';

interface Props {
	heroClass: HeroClass;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	onChange: (heroClass: HeroClass) => void;
}

export const ClassEditPanel = (props: Props) => {
	const [ heroClass, setHeroClass ] = useState<HeroClass>(props.heroClass);
	const [ subclassID, setSubclassID ] = useState<string>('');
	const [ drawerOpen, setDrawerOpen ] = useState<boolean>(false);

	const getNameAndDescriptionSection = () => {
		const onChange = (name: string, desc: string) => {
			const copy = Utils.copy(heroClass);
			copy.name = name;
			copy.description = desc;
			setHeroClass(copy);
			props.onChange(copy);
		};

		return (
			<NameDescEditPanel
				element={heroClass}
				onChange={onChange}
			/>
		);
	};

	const getClassEditSection = () => {
		const setType = (value: 'standard' | 'master') => {
			const copy = Utils.copy(heroClass);
			copy.type = value;
			setHeroClass(copy);
			props.onChange(copy);
		};

		const setSubclassName = (value: string) => {
			const copy = Utils.copy(heroClass);
			copy.subclassName = value;
			setHeroClass(copy);
			props.onChange(copy);
		};

		const setSubclassCount = (value: number) => {
			const copy = Utils.copy(heroClass);
			copy.subclassCount = value;
			setHeroClass(copy);
			props.onChange(copy);
		};

		const addCharacteristicSet = () => {
			const copy = Utils.copy(heroClass);
			copy.primaryCharacteristicsOptions.push([]);
			setHeroClass(copy);
			props.onChange(copy);
		};

		const toggleCharacteristic = (index: number, characteristic: Characteristic) => {
			const copy = Utils.copy(heroClass);
			if (copy.primaryCharacteristicsOptions[index].includes(characteristic)) {
				copy.primaryCharacteristicsOptions[index] = copy.primaryCharacteristicsOptions[index].filter(ch => ch !== characteristic);
			} else {
				copy.primaryCharacteristicsOptions[index].push(characteristic);
			}
			setHeroClass(copy);
			props.onChange(copy);
		};

		const onDragEndCharacteristicSets = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(heroClass);
				copy.primaryCharacteristicsOptions = arrayMove(copy.primaryCharacteristicsOptions, Number(active.id), Number(over.id));
				setHeroClass(copy);
				props.onChange(copy);
			}
		};

		const deleteCharacteristicSet = (index: number) => {
			const copy = Utils.copy(heroClass);
			copy.primaryCharacteristicsOptions.splice(index, 1);
			setHeroClass(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText>Type</HeaderText>
				<Segmented
					block={true}
					options={[
						{
							value: 'standard', label: 'Class'
						},
						{
							value: 'master', label: 'Master Class'
						}
					]}
					value={heroClass.type}
					onChange={setType}
				/>
				<HeaderText>Subclass Name</HeaderText>
				<TextInput
					status={heroClass.subclassName === '' ? 'warning' : ''}
					placeholder='Subclass name'
					allowClear={true}
					value={heroClass.subclassName}
					onChange={setSubclassName}
				/>
				<HeaderText>Subclass Count</HeaderText>
				<NumberSpin
					min={0}
					value={heroClass.subclassCount}
					onChange={setSubclassCount}
				/>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addCharacteristicSet} />
					}
				>
					Primary Characteristics
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndCharacteristicSets}>
					<SortableContext items={heroClass.primaryCharacteristicsOptions.map((_, n) => String(n))} strategy={verticalListSortingStrategy}>
						{
							heroClass.primaryCharacteristicsOptions.map((o, n) => (
								<DraggableExpander
									key={n}
									id={String(n)}
									title={o.join(', ') || 'No Characteristics'}
									extra={[
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteCharacteristicSet(n); }} />
									]}
								>
									<Space orientation='vertical' style={{ width: '100%' }}>
										<Toggle label={Characteristic.Might} value={o.includes(Characteristic.Might)} onChange={() => toggleCharacteristic(n, Characteristic.Might)} />
										<Toggle label={Characteristic.Agility} value={o.includes(Characteristic.Agility)} onChange={() => toggleCharacteristic(n, Characteristic.Agility)} />
										<Toggle label={Characteristic.Reason} value={o.includes(Characteristic.Reason)} onChange={() => toggleCharacteristic(n, Characteristic.Reason)} />
										<Toggle label={Characteristic.Intuition} value={o.includes(Characteristic.Intuition)} onChange={() => toggleCharacteristic(n, Characteristic.Intuition)} />
										<Toggle label={Characteristic.Presence} value={o.includes(Characteristic.Presence)} onChange={() => toggleCharacteristic(n, Characteristic.Presence)} />
										{
											(o.length === 0) || (o.length >= 3) ?
												<Alert
													type='warning'
													showIcon={true}
													title='One or two characteristics must be selected.'
												/>
												: null
										}
									</Space>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					heroClass.primaryCharacteristicsOptions.length === 0 ?
						<Alert
							type='warning'
							showIcon={true}
							title='A class must have one or two primary characteristics.'
						/>
						: null
				}
			</Space>
		);
	};

	const getFeaturesByLevelEditSection = () => {
		const onChange = (level: number, features: Feature[]) => {
			const copy = Utils.copy(heroClass);
			copy.featuresByLevel
				.filter(lvl => lvl.level === level)
				.forEach(lvl => lvl.features = Utils.copy(features));
			setHeroClass(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				{
					heroClass.featuresByLevel.map(lvl => (
						<FeatureListEditPanel
							key={lvl.level}
							title={`Level ${lvl.level}`}
							features={lvl.features}
							sourcebooks={props.sourcebooks}
							onChange={features => onChange(lvl.level, features)}
						/>
					))
				}
			</Space>
		);
	};

	const getClassAbilitiesEditSection = () => {
		const addAbility = () => {
			const copy = Utils.copy(heroClass);
			copy.abilities.push(FactoryLogic.createAbility({
				id: Utils.guid(),
				name: '',
				description: '',
				type: FactoryLogic.type.createMain(),
				keywords: [],
				distance: [ FactoryLogic.distance.createMelee() ],
				target: '',
				sections: []
			}));
			setHeroClass(copy);
			props.onChange(copy);
		};

		const changeAbility = (ability: Ability) => {
			const copy = Utils.copy(heroClass);
			const index = copy.abilities.findIndex(a => a.id === ability.id);
			if (index !== -1) {
				copy.abilities[index] = ability;
			}
			setHeroClass(copy);
			props.onChange(copy);
		};

		const onDragEndAbilities = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(heroClass);
				const oldIndex = copy.abilities.findIndex(a => a.id === active.id);
				const newIndex = copy.abilities.findIndex(a => a.id === over.id);
				copy.abilities = arrayMove(copy.abilities, oldIndex, newIndex);
				setHeroClass(copy);
				props.onChange(copy);
			}
		};

		const deleteAbility = (ability: Ability) => {
			const copy = Utils.copy(heroClass);
			copy.abilities = copy.abilities.filter(a => a.id !== ability.id);
			setHeroClass(copy);
			props.onChange(copy);
		};

		return (
			<>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addAbility} />
					}
				>
					Abilities
				</HeaderText>
				<Space orientation='vertical' style={{ width: '100%' }}>
					<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndAbilities}>
						<SortableContext items={heroClass.abilities.map(a => a.id)} strategy={verticalListSortingStrategy}>
							{
								heroClass.abilities.map(a => (
									<DraggableExpander
										key={a.id}
										id={a.id}
										title={a.name || 'Unnamed Ability'}
										tags={[ a.type.usage ]}
										extra={[
											<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteAbility(a); }} />
										]}
									>
										<AbilityEditPanel
											ability={a}
											onChange={changeAbility}
										/>
									</DraggableExpander>
								))
							}
						</SortableContext>
					</DndContext>
					{
						heroClass.abilities.length === 0 ?
							<Empty />
							: null
					}
				</Space>
			</>
		);
	};

	const getClassSubclassesEditSection = () => {
		const addSubclass = () => {
			const copy = Utils.copy(heroClass);
			copy.subclasses.push(FactoryLogic.createSubclass());
			setHeroClass(copy);
			props.onChange(copy);
		};

		const copySubclass = (subclass: SubClass) => {
			const subclassCopy = Utils.copy(subclass);
			subclassCopy.id = Utils.guid();

			const copy = Utils.copy(heroClass);
			copy.subclasses.push(subclassCopy);
			setHeroClass(copy);
			props.onChange(copy);
		};

		const onDragEndSubclasses = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(heroClass);
				const oldIndex = copy.subclasses.findIndex(sc => sc.id === active.id);
				const newIndex = copy.subclasses.findIndex(sc => sc.id === over.id);
				copy.subclasses = arrayMove(copy.subclasses, oldIndex, newIndex);
				setHeroClass(copy);
				props.onChange(copy);
			}
		};

		const deleteSubclass = (subclass: SubClass) => {
			const copy = Utils.copy(heroClass);
			copy.subclasses = copy.subclasses.filter(o => o.id !== subclass.id);
			setHeroClass(copy);
			props.onChange(copy);
		};

		return (
			<>
				<HeaderText
					extra={
						<Popover
							trigger='click'
							content={
								<Space orientation='vertical' style={{ width: '100%' }}>
									<Button block={true} icon={<PlusOutlined />} onClick={addSubclass}>
										Add a new subclass
									</Button>
									<Upload
										accept='.drawsteel-subclass,.ds-subclass'
										showUploadList={false}
										beforeUpload={file => {
											file
												.text()
												.then(json => {
													const sc = JSON.parse(json) as SubClass;
													copySubclass(sc);
												});
											return false;
										}}
									>
										<Button block={true} onClick={() => null}>
											<DownloadOutlined />
											Import a subclass
										</Button>
									</Upload>
									<Button block={true} onClick={() => setDrawerOpen(true)}>
										<CopyOutlined />
										Copy an existing subclass
									</Button>
								</Space>
							}
						>
							<Button type='text' icon={<PlusOutlined />} onClick={() => null} />
						</Popover>
					}
				>
					Subclasses
				</HeaderText>
				<Space orientation='vertical' style={{ width: '100%' }}>
					<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndSubclasses}>
						<SortableContext items={heroClass.subclasses.map(sc => sc.id)} strategy={verticalListSortingStrategy}>
							{
								heroClass.subclasses.map(sc => (
									<DraggableExpander
										key={sc.id}
										id={sc.id}
										title={sc.name || 'Unnamed Subclass'}
										extra={[
											<Button key='edit' type='text' title='Edit' icon={<EditOutlined />} onClick={e => { e.stopPropagation(); setSubclassID(sc.id); }} />,
											<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteSubclass(sc); }} />
										]}
									>
										<SubclassPanel subclass={sc} sourcebooks={props.sourcebooks} />
									</DraggableExpander>
								))
							}
						</SortableContext>
					</DndContext>
					{
						heroClass.subclasses.length === 0 ?
							<Empty />
							: null
					}
					<Drawer open={drawerOpen} closeIcon={null} onClose={() => setDrawerOpen(false)} size={500}>
						<Modal
							content={
								<Space orientation='vertical' style={{ width: '100%', padding: '20px' }}>
									{
										[
											...props.sourcebooks.flatMap(sb => sb.classes).flatMap(c => c.subclasses),
											...props.sourcebooks.flatMap(sb => sb.subclasses)
										].map((sc, n) => (
											<SelectablePanel
												key={n}
												onSelect={() => {
													copySubclass(sc);
													setDrawerOpen(false);
												}}
											>
												<SubclassPanel subclass={sc} sourcebooks={props.sourcebooks} />
											</SelectablePanel>
										))
									}
								</Space>
							}
							onClose={() => setDrawerOpen(false)}
						/>
					</Drawer>
				</Space>
			</>
		);
	};

	return (
		<ErrorBoundary>
			<Select
				options={[
					{ label: `Class: ${heroClass.name || 'Unnamed Class'}`, value: '' },
					...heroClass.subclasses.map(sc => ({ label: `Subclass: ${sc.name || 'Unnamed Subclass'}`, value: sc.id }))
				]}
				optionRender={o => <div className='ds-text'>{o.data.label}</div>}
				value={subclassID}
				onChange={setSubclassID}
			/>
			{
				subclassID === '' ?
					<div className='class-edit-panel'>
						<div className='class-workspace-column'>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Class',
										children: getNameAndDescriptionSection()
									},
									{
										key: '2',
										label: 'Details',
										children: getClassEditSection()
									},
									{
										key: '3',
										label: 'Levels',
										children: getFeaturesByLevelEditSection()
									},
									{
										key: '4',
										label: 'Abilities',
										children: getClassAbilitiesEditSection()
									},
									{
										key: '5',
										label: 'Subclasses',
										children: getClassSubclassesEditSection()
									}
								]}
							/>
						</div>
						{
							props.mode === PanelMode.Full ?
								<div className='class-preview-column'>
									<Tabs
										items={[
											{
												key: '1',
												label: 'Preview',
												children: (
													<SelectablePanel>
														<ClassPanel
															heroClass={heroClass}
															sourcebooks={props.sourcebooks}
															mode={PanelMode.Full}
														/>
													</SelectablePanel>
												)
											}
										]}
									/>
								</div>
								: null
						}
					</div>
					:
					<SubClassEditPanel
						key={subclassID}
						subClass={heroClass.subclasses.find(sc => sc.id === subclassID) as SubClass}
						sourcebooks={props.sourcebooks}
						mode={PanelMode.Full}
						onChange={sc => {
							const copy = Utils.copy(heroClass);
							const index = copy.subclasses.findIndex(s => s.id === sc.id);
							if (index !== -1) {
								copy.subclasses[index] = sc;
							}
							setHeroClass(copy);
							props.onChange(copy);
						}}
					/>
			}
		</ErrorBoundary>
	);
};
