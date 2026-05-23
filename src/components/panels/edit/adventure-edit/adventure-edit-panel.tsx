import { Button, Space, Tabs } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Markdown, MarkdownEditor } from '@/components/controls/markdown/markdown';
import { Adventure } from '@/models/adventure';
import { AdventureLogic } from '@/logic/adventure-logic';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FactoryLogic } from '@/logic/factory-logic';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Plot } from '@/models/plot';
import { PlotEditPanel } from '@/components/panels/edit/plot-edit/plot-edit-panel';
import { PlotGraphPanel } from '@/components/panels/plot-graph/plot-graph-panel';
import { Sourcebook } from '@/models/sourcebook';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './adventure-edit-panel.scss';

interface Props {
	adventure: Adventure;
	sourcebooks: Sourcebook[];
	onChange: (adventure: Adventure) => void;
}

export const AdventureEditPanel = (props: Props) => {
	const [ adventure, setAdventure ] = useState<Adventure>(Utils.copy(props.adventure));
	const [ currentPlot, setCurrentPlot ] = useState<Plot>(adventure.plot);
	const [ selectedPlot, setSelectedPlot ] = useState<Plot | null>(null);

	const addPlotPoint = (previousID?: string) => {
		const copy = Utils.copy(adventure);
		const currentPlotCopy = AdventureLogic.getPlotPoint(copy.plot, currentPlot.id);

		if (currentPlotCopy) {
			const plot = FactoryLogic.createAdventurePlot();
			currentPlotCopy.plots.push(plot);

			if (previousID) {
				const previous = currentPlotCopy.plots.find(p => p.id === previousID);
				if (previous) {
					previous.links.push({
						id: Utils.guid(),
						plotID: plot.id,
						label: ''
					});
				}
			}

			setAdventure(copy);
			setCurrentPlot(currentPlotCopy);
			setSelectedPlot(plot);
			if (props.onChange) {
				props.onChange(copy);
			}
		}
	};

	const deletePlotPoint = (id: string) => {
		const copy = Utils.copy(adventure);
		const currentPlotCopy = AdventureLogic.getPlotPoint(copy.plot, currentPlot.id);

		if (currentPlotCopy) {
			currentPlotCopy.plots = currentPlotCopy.plots.filter(p => p.id !== id);
			currentPlotCopy.plots.forEach(p => {
				p.links = p.links.filter(l => l.plotID !== id);
			});

			setAdventure(copy);
			setCurrentPlot(currentPlotCopy);
			if (selectedPlot && (selectedPlot.id === id)) {
				setSelectedPlot(null);
			}
			if (props.onChange) {
				props.onChange(copy);
			}
		}
	};

	const getAdventureEditor = () => {
		const setNameDesc = (name: string, desc: string) => {
			const copy = Utils.copy(adventure);
			copy.name = name;
			copy.plot.name = name;
			copy.description = desc;
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const setCount = (value: number) => {
			const copy = Utils.copy(adventure);
			copy.party.count = value;
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const setLevel = (value: number) => {
			const copy = Utils.copy(adventure);
			copy.party.level = value;
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const addSection = () => {
			const copy = Utils.copy(adventure);
			copy.introduction.push(FactoryLogic.createElement());
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const setSectionName = (index: number, value: string) => {
			const copy = Utils.copy(adventure);
			const m = copy.introduction[index];
			m.name = value;
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const setSectionDescription = (index: number, value: string) => {
			const copy = Utils.copy(adventure);
			const m = copy.introduction[index];
			m.description = value;
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const onDragEndSections = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(adventure);
				const oldIndex = copy.introduction.findIndex(s => s.id === active.id);
				const newIndex = copy.introduction.findIndex(s => s.id === over.id);
				copy.introduction = arrayMove(copy.introduction, oldIndex, newIndex);
				setAdventure(copy);
				if (props.onChange) {
					props.onChange(copy);
				}
			}
		};

		const deleteSection = (id: string) => {
			const copy = Utils.copy(adventure);
			copy.introduction = copy.introduction.filter(section => section.id !== id);
			setAdventure(copy);
			if (props.onChange) {
				props.onChange(copy);
			}
		};

		const onDragEndPlotPoints = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(adventure);
				const oldIndex = copy.plot.plots.findIndex(p => p.id === active.id);
				const newIndex = copy.plot.plots.findIndex(p => p.id === over.id);
				copy.plot.plots = arrayMove(copy.plot.plots, oldIndex, newIndex);
				setAdventure(copy);
				if (props.onChange) {
					props.onChange(copy);
				}
			}
		};

		return (
			<Tabs
				items={[
					{
						key: '1',
						label: 'Adventure',
						children: (
							<NameDescEditPanel
								element={adventure}
								onChange={setNameDesc}
							/>
						)
					},
					{
						key: '2',
						label: 'Party',
						children: (
							<Space orientation='vertical' style={{ width: '100%' }}>
								<HeaderText>Party</HeaderText>
								<NumberSpin label='Number of Heroes' min={1} value={adventure.party.count} onChange={setCount} />
								<NumberSpin label='Hero Level' min={1} max={10} value={adventure.party.level} onChange={setLevel} />
							</Space>
						)
					},
					{
						key: '3',
						label: 'Sections',
						children: (
							<Space orientation='vertical' style={{ width: '100%' }}>
								<HeaderText
									extra={
										<Button type='text' icon={<PlusOutlined />} onClick={addSection} />
									}
								>
									Sections
								</HeaderText>
								<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndSections}>
									<SortableContext items={adventure.introduction.map(s => s.id)} strategy={verticalListSortingStrategy}>
										{
											adventure.introduction.map((section, n) => (
												<DraggableExpander
													key={section.id}
													id={section.id}
													title={section.name || 'Unnamed Section'}
													extra={[
														<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteSection(section.id); }} />
													]}
												>
													<HeaderText>Section</HeaderText>
													<Space orientation='vertical' style={{ width: '100%' }}>
														<TextInput
															status={section.name === '' ? 'warning' : ''}
															placeholder='Name'
															allowClear={true}
															value={section.name}
															onChange={value => setSectionName(n, value)}
														/>
														<MarkdownEditor placeholder='Description' value={section.description} onChange={value => setSectionDescription(n, value)} />
													</Space>
												</DraggableExpander>
											))
										}
									</SortableContext>
								</DndContext>
								{
									adventure.introduction.length === 0 ?
										<Empty />
										: null
								}
							</Space>
						)
					},
					{
						key: '4',
						label: 'Plot Points',
						children: (
							<Space orientation='vertical' style={{ width: '100%' }}>
								<HeaderText
									extra={
										<Button type='text' icon={<PlusOutlined />} onClick={() => addPlotPoint()} />
									}
								>
									Plot Points
								</HeaderText>
								<DndContext collisionDetection={closestCenter} onDragEnd={onDragEndPlotPoints}>
									<SortableContext items={currentPlot.plots.map(p => p.id)} strategy={verticalListSortingStrategy}>
										{
											currentPlot.plots.map(p => (
												<DraggableExpander
													key={p.id}
													id={p.id}
													title={p.name || 'Unnamed Plot Point'}
													extra={[
														<Button key='edit' type='text' title='Edit' icon={<EditOutlined />} onClick={e => { e.stopPropagation(); setSelectedPlot(p); }} />,
														<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deletePlotPoint(p.id); }} />
													]}
												>
													<HeaderText>{p.name}</HeaderText>
													<Markdown text={p.description} />
												</DraggableExpander>
											))
										}
									</SortableContext>
								</DndContext>
								{
									currentPlot.plots.length === 0 ?
										<Empty />
										: null
								}
							</Space>
						)
					}
				]}
			/>
		);
	};

	const getPlotEditor = (plot: Plot) => {
		const changePlotPoint = (plot: Plot) => {
			const copy = Utils.copy(adventure);
			const currentPlotCopy = AdventureLogic.getPlotPoint(copy.plot, currentPlot.id);

			if (currentPlotCopy) {
				const index = currentPlotCopy.plots.findIndex(p => p.id === plot.id);
				if (index !== -1) {
					currentPlotCopy.plots[index] = plot;
				}

				setAdventure(copy);
				setCurrentPlot(currentPlotCopy);
				if (selectedPlot && (selectedPlot.id === plot.id)) {
					setSelectedPlot(plot);
				}
				if (props.onChange) {
					props.onChange(copy);
				}
			}
		};

		return (
			<PlotEditPanel
				key={plot.id}
				plot={plot}
				adventure={adventure}
				sourcebooks={props.sourcebooks}
				onChange={changePlotPoint}
				onAddAfter={addPlotPoint}
				onDelete={deletePlotPoint}
			/>
		);
	};

	const getEditor = () => {
		if (selectedPlot) {
			return getPlotEditor(selectedPlot);
		}

		if (currentPlot.id !== adventure.plot.id) {
			return getPlotEditor(currentPlot);
		}

		return getAdventureEditor();
	};

	return (
		<ErrorBoundary>
			<div className='adventure-edit-panel'>
				<div className='plot-workspace'>
					<PlotGraphPanel
						label={currentPlot === adventure.plot ? adventure.name || 'Unnamed Adventure' : currentPlot.name || 'Unnamed Plot Point'}
						tags={[]}
						plot={currentPlot}
						adventure={adventure}
						selectedPlot={selectedPlot || undefined}
						onSelect={setSelectedPlot}
						onOpen={plot => {
							setSelectedPlot(null);
							setCurrentPlot(plot);
						}}
						onCreate={addPlotPoint}
					/>
				</div>
				<div className='plot-editor'>
					{getEditor()}
				</div>
			</div>
		</ErrorBoundary>
	);
};
