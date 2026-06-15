import { Button, Select, Space, Tabs } from 'antd';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Characteristic } from '@/enums/characteristic';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { EncounterDifficulty } from '@/enums/encounter-difficulty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { PlusOutlined } from '@ant-design/icons';
import { FactoryLogic } from '@/logic/factory-logic';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { MarkdownEditor } from '@/components/controls/markdown/markdown';
import { Montage } from '@/models/montage';
import { MontagePanel } from '@/components/panels/elements/montage-panel/montage-panel';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './montage-edit-panel.scss';

interface Props {
	montage: Montage;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	onChange: (montage: Montage) => void;
}

export const MontageEditPanel = (props: Props) => {
	const [ montage, setMontage ] = useState<Montage>(props.montage);

	const getNameAndDescriptionSection = () => {
		const onChange = (name: string, desc: string) => {
			const copy = Utils.copy(montage);
			copy.name = name;
			copy.description = desc;
			setMontage(copy);
			props.onChange(copy);
		};

		return (
			<NameDescEditPanel
				element={montage}
				onChange={onChange}
			/>
		);
	};

	const getMontageSceneSection = () => {
		const setDifficulty = (value: EncounterDifficulty) => {
			const copy = Utils.copy(montage);
			copy.difficulty = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setScene = (value: string) => {
			const copy = Utils.copy(montage);
			copy.scene = value;
			setMontage(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText>Difficulty</HeaderText>
				<Select
					style={{ width: '100%' }}
					placeholder='Select difficulty'
					options={[ EncounterDifficulty.Easy, EncounterDifficulty.Standard, EncounterDifficulty.Hard ].map(diff => ({ value: diff, label: <div className='ds-text'>{diff}</div> }))}
					value={montage.difficulty}
					onChange={setDifficulty}
				/>
				<HeaderText>Setting the Scene</HeaderText>
				<MarkdownEditor value={montage.scene} onChange={setScene} />
			</Space>
		);
	};

	const getMontageSectionsSection = () => {
		const addSection = () => {
			const copy = Utils.copy(montage);
			copy.sections.push(FactoryLogic.createMontageSection());
			setMontage(copy);
			props.onChange(copy);
		};

		const setSectionName = (index: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[index];
			s.name = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setSectionDescription = (index: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[index];
			s.description = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setSectionTwistInfo = (index: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[index];
			s.twistInfo = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const onDragEndSections = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(montage);
				const oldIndex = copy.sections.findIndex(s => s.id === active.id);
				const newIndex = copy.sections.findIndex(s => s.id === over.id);
				copy.sections = arrayMove(copy.sections, oldIndex, newIndex);
				setMontage(copy);
				props.onChange(copy);
			}
		};

		const deleteSection = (id: string) => {
			const copy = Utils.copy(montage);
			copy.sections = copy.sections.filter(s => s.id !== id);
			setMontage(copy);
			props.onChange(copy);
		};

		const addChallenge = (sectionIndex: number) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			s.challenges.push(FactoryLogic.createMontageChallenge({
				id: Utils.guid(),
				name: '',
				description: ''
			}));
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeName = (sectionIndex: number, challengeIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.name = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeDescription = (sectionIndex: number, challengeIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.description = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeCharacteristics = (sectionIndex: number, challengeIndex: number, value: Characteristic[]) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.characteristics = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeSkills = (sectionIndex: number, challengeIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.skills = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeAbilities = (sectionIndex: number, challengeIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.abilities = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setChallengeUses = (sectionIndex: number, challengeIndex: number, value: number) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const c = s.challenges[challengeIndex];
			c.uses = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const onDragEndChallenges = (sectionIndex: number) => (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(montage);
				const s = copy.sections[sectionIndex];
				const oldIndex = s.challenges.findIndex(c => c.id === active.id);
				const newIndex = s.challenges.findIndex(c => c.id === over.id);
				s.challenges = arrayMove(s.challenges, oldIndex, newIndex);
				setMontage(copy);
				props.onChange(copy);
			}
		};

		const deleteChallenge = (sectionIndex: number, id: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			s.challenges = s.challenges.filter(c => c.id !== id);
			setMontage(copy);
			props.onChange(copy);
		};

		const addTwist = (sectionIndex: number) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			s.twists.push(FactoryLogic.createMontageChallenge({
				id: Utils.guid(),
				name: '',
				description: ''
			}));
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistName = (sectionIndex: number, twistIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.name = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistDescription = (sectionIndex: number, twistIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.description = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistCharacteristics = (sectionIndex: number, twistIndex: number, value: Characteristic[]) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.characteristics = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistSkills = (sectionIndex: number, twistIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.skills = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistAbilities = (sectionIndex: number, twistIndex: number, value: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.abilities = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setTwistUses = (sectionIndex: number, twistIndex: number, value: number) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			const t = s.twists[twistIndex];
			t.uses = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const onDragEndTwists = (sectionIndex: number) => (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(montage);
				const s = copy.sections[sectionIndex];
				const oldIndex = s.twists.findIndex(t => t.id === active.id);
				const newIndex = s.twists.findIndex(t => t.id === over.id);
				s.twists = arrayMove(s.twists, oldIndex, newIndex);
				setMontage(copy);
				props.onChange(copy);
			}
		};

		const deleteTwist = (sectionIndex: number, id: string) => {
			const copy = Utils.copy(montage);
			const s = copy.sections[sectionIndex];
			s.twists = s.twists.filter(t => t.id !== id);
			setMontage(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addSection} />
					}
				>
					Sections
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndSections}>
					<SortableContext items={montage.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
				{
					montage.sections.map((s, sectionIndex) => (
						<DraggableExpander
							key={s.id}
							id={s.id}
							title={s.name || 'Section'}
							extra={[
								<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteSection(s.id); }} />
							]}
						>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Section',
										children: (
											<div>
												<HeaderText>Name</HeaderText>
												<MarkdownEditor value={s.name} onChange={value => setSectionName(sectionIndex, value)} />
												<HeaderText>Description</HeaderText>
												<MarkdownEditor value={s.description} onChange={value => setSectionDescription(sectionIndex, value)} />
											</div>
										)
									},
									{
										key: '2',
										label: 'Challenges',
										children: (
											<Space orientation='vertical' style={{ width: '100%' }}>
												<HeaderText
													extra={
														<Button type='text' icon={<PlusOutlined />} onClick={() => addChallenge(sectionIndex)} />
													}
												>
													Challenges
												</HeaderText>
												<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndChallenges(sectionIndex)}>
													<SortableContext items={s.challenges.map(c => c.id)} strategy={verticalListSortingStrategy}>
												{
													s.challenges.map((c, challengeIndex) => (
														<DraggableExpander
															key={c.id}
															id={c.id}
															title={c.name || 'Challenge'}
															extra={[
																<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteChallenge(sectionIndex, c.id); }} />
															]}
														>
															<HeaderText>Name</HeaderText>
															<TextInput
																status={c.name === '' ? 'warning' : ''}
																placeholder='Name'
																allowClear={true}
																value={c.name}
																onChange={value => setChallengeName(sectionIndex, challengeIndex, value)}
															/>
															<HeaderText>Description</HeaderText>
															<MarkdownEditor value={c.description} onChange={value => setChallengeDescription(sectionIndex, challengeIndex, value)} />
															<HeaderText>Characteristics</HeaderText>
															<Select
																style={{ width: '100%' }}
																mode='multiple'
																placeholder='Select characteristics'
																options={[ Characteristic.Might, Characteristic.Agility, Characteristic.Reason, Characteristic.Intuition, Characteristic.Presence ].map(ch => ({ value: ch }))}
																optionRender={option => <div className='ds-text'>{option.data.value}</div>}
																value={c.characteristics}
																onChange={value => setChallengeCharacteristics(sectionIndex, challengeIndex, value)}
															/>
															<HeaderText>Skills</HeaderText>
															<TextInput
																placeholder='Skills'
																allowClear={true}
																value={c.skills}
																onChange={value => setChallengeSkills(sectionIndex, challengeIndex, value)}
															/>
															<HeaderText>Abilities</HeaderText>
															<TextInput
																placeholder='Abilities'
																allowClear={true}
																value={c.abilities}
																onChange={value => setChallengeAbilities(sectionIndex, challengeIndex, value)}
															/>
															<HeaderText>Uses</HeaderText>
															<NumberSpin label='Uses' min={1} value={c.uses} onChange={value => setChallengeUses(sectionIndex, challengeIndex, value)} />
														</DraggableExpander>
													))
												}
													</SortableContext>
												</DndContext>
												{
													s.challenges.length === 0 ?
														<Empty />
														: null
												}
											</Space>
										)
									},
									{
										key: '3',
										label: 'Twists',
										children: (
											<Space orientation='vertical' style={{ width: '100%' }}>
												<HeaderText
													extra={
														<Button type='text' icon={<PlusOutlined />} onClick={() => addTwist(sectionIndex)} />
													}
												>
													Twists
												</HeaderText>
												<MarkdownEditor value={s.twistInfo} onChange={value => setSectionTwistInfo(sectionIndex, value)} />
												<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndTwists(sectionIndex)}>
													<SortableContext items={s.twists.map(t => t.id)} strategy={verticalListSortingStrategy}>
												{
													s.twists.map((t, twistIndex) => (
														<DraggableExpander
															key={t.id}
															id={t.id}
															title={t.name || 'Twist'}
															extra={[
																<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteTwist(sectionIndex, t.id); }} />
															]}
														>
															<HeaderText>Name</HeaderText>
															<TextInput
																status={t.name === '' ? 'warning' : ''}
																placeholder='Name'
																allowClear={true}
																value={t.name}
																onChange={value => setTwistName(sectionIndex, twistIndex, value)}
															/>
															<HeaderText>Description</HeaderText>
															<MarkdownEditor value={t.description} onChange={value => setTwistDescription(sectionIndex, twistIndex, value)} />
															<HeaderText>Characteristics</HeaderText>
															<Select
																style={{ width: '100%' }}
																status={t.characteristics.length < 2 ? 'warning' : ''}
																mode='multiple'
																placeholder='Select characteristics'
																options={[ Characteristic.Might, Characteristic.Agility, Characteristic.Reason, Characteristic.Intuition, Characteristic.Presence ].map(ch => ({ value: ch }))}
																optionRender={option => <div className='ds-text'>{option.data.value}</div>}
																value={t.characteristics}
																onChange={value => setTwistCharacteristics(sectionIndex, twistIndex, value)}
															/>
															<HeaderText>Skills</HeaderText>
															<TextInput
																status={t.skills === '' ? 'warning' : ''}
																placeholder='Skills'
																allowClear={true}
																value={t.skills}
																onChange={value => setTwistSkills(sectionIndex, twistIndex, value)}
															/>
															<HeaderText>Abilities</HeaderText>
															<TextInput
																status={t.abilities === '' ? 'warning' : ''}
																placeholder='Skills'
																allowClear={true}
																value={t.abilities}
																onChange={value => setTwistAbilities(sectionIndex, twistIndex, value)}
															/>
															<HeaderText>Uses</HeaderText>
															<NumberSpin label='Uses' min={1} value={t.uses} onChange={value => setTwistUses(sectionIndex, twistIndex, value)} />
														</DraggableExpander>
													))
												}
												</SortableContext>
												</DndContext>
												{
													s.challenges.length === 0 ?
														<Empty />
														: null
												}
											</Space>
										)
									}
								]}
							/>
						</DraggableExpander>
					))
				}
				</SortableContext>
				</DndContext>
				{
					montage.sections.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	const getMontageOutcomesSection = () => {
		const setSuccess = (value: string) => {
			const copy = Utils.copy(montage);
			copy.outcomes.totalSuccess = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setPartial = (value: string) => {
			const copy = Utils.copy(montage);
			copy.outcomes.partialSuccess = value;
			setMontage(copy);
			props.onChange(copy);
		};

		const setFailure = (value: string) => {
			const copy = Utils.copy(montage);
			copy.outcomes.totalFailure = value;
			setMontage(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText>Total Success</HeaderText>
				<MarkdownEditor value={montage.outcomes.totalSuccess} onChange={setSuccess} />
				<HeaderText>Partial Success</HeaderText>
				<MarkdownEditor value={montage.outcomes.partialSuccess} onChange={setPartial} />
				<HeaderText>Total Failure</HeaderText>
				<MarkdownEditor value={montage.outcomes.totalFailure} onChange={setFailure} />
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<div className='montage-edit-panel'>
				<div className='montage-workspace-column'>
					<Tabs
						items={[
							{
								key: '1',
								label: 'Montage',
								children: getNameAndDescriptionSection()
							},
							{
								key: '2',
								label: 'Scene',
								children: getMontageSceneSection()
							},
							{
								key: '3',
								label: 'Sections',
								children: getMontageSectionsSection()
							},
							{
								key: '4',
								label: 'Outcomes',
								children: getMontageOutcomesSection()
							}
						]}
					/>
				</div>
				{
					props.mode === PanelMode.Full ?
						<div className='montage-preview-column'>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Preview',
										children: (
											<SelectablePanel>
												<MontagePanel
													montage={montage}
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
		</ErrorBoundary>
	);
};
