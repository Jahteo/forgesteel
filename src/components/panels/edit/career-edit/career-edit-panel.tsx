import { Button, Space, Tabs } from 'antd';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Career } from '@/models/career';
import { CareerPanel } from '@/components/panels/elements/career-panel/career-panel';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { DraggableExpander } from '@/components/controls/draggable-expander/draggable-expander';
import { Element } from '@/models/element';
import { ElementEditPanel } from '@/components/panels/edit/element-edit/element-edit-panel';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { PlusOutlined } from '@ant-design/icons';
import { Feature } from '@/models/feature';
import { FeatureListEditPanel } from '@/components/panels/edit/feature-list-edit/feature-list-edit-panel';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { NameDescEditPanel } from '@/components/panels/edit/name-desc-edit/name-desc-edit-panel';
import { PanelMode } from '@/enums/panel-mode';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './career-edit-panel.scss';

interface Props {
	career: Career;
	sourcebooks: Sourcebook[];
	mode?: PanelMode;
	onChange: (career: Career) => void;
}

export const CareerEditPanel = (props: Props) => {
	const [ career, setCareer ] = useState<Career>(props.career);

	const getNameAndDescriptionSection = () => {
		const onChange = (name: string, desc: string) => {
			const copy = Utils.copy(career);
			copy.name = name;
			copy.description = desc;
			setCareer(copy);
			props.onChange(copy);
		};

		return (
			<NameDescEditPanel
				element={career}
				onChange={onChange}
			/>
		);
	};

	const getFeaturesEditSection = () => {
		const onChange = (features: Feature[]) => {
			const copy = Utils.copy(career);
			copy.features = Utils.copy(features);
			setCareer(copy);
			props.onChange(copy);
		};

		return (
			<FeatureListEditPanel
				title='Features'
				features={career.features}
				sourcebooks={props.sourcebooks}
				onChange={onChange}
			/>
		);
	};

	const getIncitingIncidentsSection = () => {
		const addIncident = () => {
			const copy = Utils.copy(career);
			copy.incitingIncidents.options.push({
				id: Utils.guid(),
				name: '',
				description: ''
			});
			setCareer(copy);
			props.onChange(copy);
		};

		const changeIncident = (e: Element) => {
			const copy = Utils.copy(career);
			const index = copy.incitingIncidents.options.findIndex(o => o.id === e.id);
			if (index !== -1) {
				copy.incitingIncidents.options[index] = e;
			}
			setCareer(copy);
			props.onChange(copy);
		};

		const onDragEnd = (event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const copy = Utils.copy(career);
				const oldIndex = copy.incitingIncidents.options.findIndex(o => o.id === active.id);
				const newIndex = copy.incitingIncidents.options.findIndex(o => o.id === over.id);
				copy.incitingIncidents.options = arrayMove(copy.incitingIncidents.options, oldIndex, newIndex);
				setCareer(copy);
				props.onChange(copy);
			}
		};

		const deleteIncident = (e: Element) => {
			const copy = Utils.copy(career);
			copy.incitingIncidents.options = copy.incitingIncidents.options.filter(o => o.id !== e.id);
			setCareer(copy);
			props.onChange(copy);
		};

		return (
			<Space orientation='vertical' style={{ width: '100%' }}>
				<HeaderText
					extra={
						<Button type='text' icon={<PlusOutlined />} onClick={addIncident} />
					}
				>
					Inciting Incidents
				</HeaderText>
				<DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
					<SortableContext items={career.incitingIncidents.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
						{
							career.incitingIncidents.options.map(o => (
								<DraggableExpander
									key={o.id}
									id={o.id}
									title={o.name || 'Unnamed Incident'}
									extra={[
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteIncident(o); }} />
									]}
								>
									<ElementEditPanel
										element={o}
										onChange={changeIncident}
									/>
								</DraggableExpander>
							))
						}
					</SortableContext>
				</DndContext>
				{
					career.incitingIncidents.options.length === 0 ?
						<Empty />
						: null
				}
			</Space>
		);
	};

	return (
		<ErrorBoundary>
			<div className='career-edit-panel'>
				<div className='career-workspace-column'>
					<Tabs
						items={[
							{
								key: '1',
								label: 'Career',
								children: getNameAndDescriptionSection()
							},
							{
								key: '2',
								label: 'Features',
								children: getFeaturesEditSection()
							},
							{
								key: '3',
								label: 'Inciting Incidents',
								children: getIncitingIncidentsSection()
							}
						]}
					/>
				</div>
				{
					props.mode === PanelMode.Full ?
						<div className='career-preview-column'>
							<Tabs
								items={[
									{
										key: '1',
										label: 'Preview',
										children: (
											<SelectablePanel>
												<CareerPanel
													career={career}
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
