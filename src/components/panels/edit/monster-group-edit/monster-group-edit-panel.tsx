import { Button, Drawer, Flex, Popover, Select, Space, Tabs, Upload } from 'antd';
import { CopyOutlined, DownloadOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Feature, FeatureAddOn } from '@/models/feature';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Element } from '@/models/element';
import { ElementEditPanel } from '@/components/panels/edit/element-edit/element-edit-panel';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeatureAddOnType } from '@/enums/feature-addon-type';
import { FeatureEditPanel } from '@/components/panels/edit/feature-edit/feature-edit-panel';
import { FeatureListEditPanel } from '@/components/panels/edit/feature-list-edit/feature-list-edit-panel';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Monster } from '@/models/monster';
import { MonsterEditPanel } from '@/components/panels/edit/monster-edit/monster-edit-panel';
import { MonsterGroup } from '@/models/monster-group';
import { MonsterGroupPanel } from '@/components/panels/elements/monster-group-panel/monster-group-panel';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { MonsterPanel } from '@/components/panels/elements/monster-panel/monster-panel';
import { MonsterRoleType } from '@/enums/monster-role-type';
import { MonsterSelectModal } from '@/components/modals/select/monster-select/monster-select-modal';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './monster-group-edit-panel.scss';

interface Props {
	monsterGroup: MonsterGroup;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	onChange: (monsterGroup: MonsterGroup) => void;
	onSelectMonster: (monster: Monster, group: MonsterGroup) => void;
}

export const MonsterGroupEditPanel = (props: Props) => {
	const [ monsterGroup, setMonsterGroup ] = useState<MonsterGroup>(props.monsterGroup);
	const [ monsterID, setMonsterID ] = useState<string>('');
	const [ drawerOpen, setDrawerOpen ] = useState<boolean>(false);

	const getNameAndDescriptionSection = () => {
		const setNameDesc = (name: string, description: string) => {
			const copy = Utils.copy(monsterGroup);
			copy.name = name;
			copy.description = description;
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const setPicture = (value: string | null) => {
			const copy = Utils.copy(monsterGroup);
			copy.picture = value;
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<NameDescEditPanel
					element={monsterGroup}
					showNameGenerator={true}
					onChange={setNameDesc}
				/>
				<HeaderText>Portrait</HeaderText>
				{
					monsterGroup.picture ?
						<Flex align='center' justify='center' gap={10}>
							<img className='portrait-edit' src={monsterGroup.picture} title='Portrait' />
							<DangerButton mode='clear' onConfirm={() => setPicture(null)} />
						</Flex>
						:
						<Upload
							style={{ width: '100%' }}
							accept='.png,.webp,.gif,.jpg,.jpeg,.svg'
							showUploadList={false}
							beforeUpload={file => {
								const reader = new FileReader();
								reader.onload = async progress => {
									if (progress.target) {
										const content = progress.target.result as string;
										const resized = await Utils.getResizedImage(content);
										setPicture(resized);
									}
								};
								reader.readAsDataURL(file);
								return false;
							}}
						>
							<Button>
								<DownloadOutlined />
								Choose a picture
							</Button>
						</Upload>
				}
			</Space>
		);
	};

	const getInformationEditSection = () => {
		const addInformation = () => {
			const copy = Utils.copy(monsterGroup);
			copy.information.push({
				id: Utils.guid(),
				name: '',
				description: ''
			});
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const changeInformation = (information: Element) => {
			const copy = Utils.copy(monsterGroup);
			const index = copy.information.findIndex(i => i.id === information.id);
			if (index !== -1) {
				copy.information[index] = information;
			}
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const onDragEndInformation = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(monsterGroup);
				const oldIndex = copy.information.findIndex(i => i.id === active.id);
				const newIndex = copy.information.findIndex(i => i.id === over.id);
				copy.information = arrayMove(copy.information, oldIndex, newIndex);
				setMonsterGroup(copy);
				props.onChange(copy);
			}
		};

		const deleteInformation = (information: Element) => {
			const copy = Utils.copy(monsterGroup);
			copy.information = copy.information.filter(i => i.id !== information.id);
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addInformation} />
					}
				>
					Information
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndInformation}>
					<SortableContext items={monsterGroup.information.map(i => i.id)} strategy={verticalListSortingStrategy}>
						{
							monsterGroup.information.map(i => (
								<DraggableExpander
									key={i.id}
									id={i.id}
									title={i.name || 'Unnamed Information'}
									extra={[
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteInformation(i); }} />
									]}
								>
									<ElementEditPanel
										element={i}
										onChange={changeInformation}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					monsterGroup.information.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	const getMaliceEditSection = () => {
		const onChange = (features: Feature[]) => {
			const copy = Utils.copy(monsterGroup);
			copy.malice = Utils.copy(features);
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		return (
			<FeatureListEditPanel
				title='Malice'
				features={monsterGroup.malice}
				allowedTypes={[ FeatureType.Malice, FeatureType.MaliceAbility ]}
				sourcebooks={props.sourcebooks}
				onChange={onChange}
			/>
		);
	};

	const getMonstersEditSection = () => {
		const addMonster = () => {
			const copy = Utils.copy(monsterGroup);
			copy.monsters.push(FactoryLogic.createMonster({
				id: Utils.guid(),
				name: '',
				level: 1,
				role: FactoryLogic.createMonsterRole(MonsterOrganizationType.Platoon, MonsterRoleType.Ambusher),
				keywords: [],
				encounterValue: 0,
				size: FactoryLogic.createSize(1, 'M'),
				speed: FactoryLogic.createSpeed(5),
				stamina: 5,
				stability: 0,
				freeStrikeDamage: 2,
				characteristics: FactoryLogic.createCharacteristics(0, 0, 0, 0, 0),
				features: []
			}));
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const copyMonster = (monster: Monster) => {
			const monsterCopy = Utils.copy(monster);
			monsterCopy.id = Utils.guid();

			const copy = Utils.copy(monsterGroup);
			copy.monsters.push(monsterCopy);
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const onDragEndMonsters = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(monsterGroup);
				const oldIndex = copy.monsters.findIndex(m => m.id === active.id);
				const newIndex = copy.monsters.findIndex(m => m.id === over.id);
				copy.monsters = arrayMove(copy.monsters, oldIndex, newIndex);
				setMonsterGroup(copy);
				props.onChange(copy);
			}
		};

		const deleteMonster = (monster: Monster) => {
			const copy = Utils.copy(monsterGroup);
			copy.monsters = copy.monsters.filter(m => m.id !== monster.id);
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Popover
							trigger='click'
							content={
								<Space orientation='vertical'>
									<Button block={true} icon={<PlusOutlined />} onClick={addMonster}>
										Add a new monster
									</Button>
									<Upload
										accept='.drawsteel-monster,.ds-monster'
										showUploadList={false}
										beforeUpload={file => {
											file
												.text()
												.then(json => {
													const monster = JSON.parse(json) as Monster;
													copyMonster(monster);
												});
											return false;
										}}
									>
										<Button block={true} onClick={() => null}>
											<DownloadOutlined />
											Import a monster
										</Button>
									</Upload>
									<Button block={true} onClick={() => setDrawerOpen(true)}>
										<CopyOutlined />
										Copy an existing monster
									</Button>
								</Space>
							}
						>
							<Button type='text' icon={<PlusOutlined />} />
						</Popover>
					}
				>
					Monsters
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndMonsters}>
					<SortableContext items={monsterGroup.monsters.map(m => m.id)} strategy={verticalListSortingStrategy}>
						{
							monsterGroup.monsters.map(m => (
								<DraggableExpander
									key={m.id}
									id={m.id}
									title={MonsterLogic.getMonsterName(m, monsterGroup)}
									extra={[
										<Button key='edit' type='text' title='Edit' icon={<EditOutlined />} onClick={e => { e.stopPropagation(); setMonsterID(m.id); }} />,
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteMonster(m); }} />
									]}
								>
									<MonsterPanel
										monster={m}
										monsterGroup={monsterGroup}
										sourcebooks={props.sourcebooks}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					monsterGroup.monsters.length === 0 ?
						<Empty />
						: null
				}
				<Drawer open={drawerOpen} closeIcon={null} onClose={() => setDrawerOpen(false)} size={500}>
					<MonsterSelectModal
						monsters={props.sourcebooks.flatMap(sb => sb.monsterGroups).flatMap(g => g.monsters)}
						sourcebooks={props.sourcebooks}
						onSelect={monster => {
							copyMonster(monster);
							setDrawerOpen(false);
						}}
						onClose={() => setDrawerOpen(false)}
					/>
				</Drawer>
			</Space>
		);
	};

	const getMonstersCustomizationSection = () => {
		const addAddOn = () => {
			const copy = Utils.copy(monsterGroup);
			copy.addOns.push(FactoryLogic.feature.createAddOn({
				id: Utils.guid(),
				name: '',
				description: '',
				category: FeatureAddOnType.Defensive,
				cost: 1
			}));
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const changeAddOn = (addOn: FeatureAddOn) => {
			const copy = Utils.copy(monsterGroup);
			const index = copy.addOns.findIndex(i => i.id === addOn.id);
			if (index !== -1) {
				copy.addOns[index] = addOn;
			}
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		const onDragEndAddOns = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(monsterGroup);
				const oldIndex = copy.addOns.findIndex(i => i.id === active.id);
				const newIndex = copy.addOns.findIndex(i => i.id === over.id);
				copy.addOns = arrayMove(copy.addOns, oldIndex, newIndex);
				setMonsterGroup(copy);
				props.onChange(copy);
			}
		};

		const deleteAddOn = (addOn: FeatureAddOn) => {
			const copy = Utils.copy(monsterGroup);
			copy.addOns = copy.addOns.filter(i => i.id !== addOn.id);
			setMonsterGroup(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addAddOn} />
					}
				>
					Customizations
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndAddOns}>
					<SortableContext items={monsterGroup.addOns.map(i => i.id)} strategy={verticalListSortingStrategy}>
						{
							monsterGroup.addOns.map(i => (
								<DraggableExpander
									key={i.id}
									id={i.id}
									title={i.name || 'Unnamed Customization'}
									extra={[
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteAddOn(i); }} />
									]}
								>
									<FeatureEditPanel
										feature={i}
										allowedTypes={[ FeatureType.AddOn ]}
										sourcebooks={props.sourcebooks}
										onChange={f => changeAddOn(f as FeatureAddOn)}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					monsterGroup.addOns.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<Select
				options={[
					{ label: `Monster Group: ${monsterGroup.name || 'Unnamed Monster Group'}`, value: '' },
					...monsterGroup.monsters.map(m => ({ label: `Monster: ${m.name || 'Unnamed Monster'}`, value: m.id }))
				]}
				optionRender={o => <div className='ds-text'>{o.data.label}</div>}
				value={monsterID}
				onChange={setMonsterID}
			/>
			{
				monsterID === '' ?
					<div className='monster-group-edit-panel'>
						<div className='monster-group-workspace-column'>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Monster Group',
										children: getNameAndDescriptionSection()
									},
									{
										key: '2',
										label: 'Information',
										children: getInformationEditSection()
									},
									{
										key: '3',
										label: 'Malice',
										children: getMaliceEditSection()
									},
									{
										key: '4',
										label: 'Monsters',
										children: getMonstersEditSection()
									},
									{
										key: '5',
										label: 'Customization',
										children: getMonstersCustomizationSection()
									}
								]}
							/>
						</div>
						{
							props.mode === PanelMode.Full ?
								<div className='monster-group-preview-column'>
									<Tabs
										items={[
											{
												key: '1',
												label: 'Preview',
												children: (
													<SelectablePanel>
														<MonsterGroupPanel
															monsterGroup={monsterGroup}
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
					<MonsterEditPanel
						key={monsterID}
						monster={monsterGroup.monsters.find(m => m.id === monsterID) as Monster}
						sourcebooks={props.sourcebooks}
						mode={PanelMode.Full}
						onChange={monster => {
							const copy = Utils.copy(monsterGroup);
							const index = copy.monsters.findIndex(m => m.id === monster.id);
							if (index !== -1) {
								copy.monsters[index] = monster;
							}
							setMonsterGroup(copy);
							props.onChange(copy);
						}}
						onSelectMonster={props.onSelectMonster}
					/>
			}
		</ErrorBoundary>
	);
};
