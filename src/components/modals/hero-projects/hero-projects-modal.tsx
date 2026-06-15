import { Button, Divider, Drawer, Space } from 'antd';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Empty } from '@/components/controls/empty/empty';
import { FactoryLogic } from '@/logic/factory-logic';
import { GroupedItemList } from '@/components/controls/grouped-item-list/grouped-item-list';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Item } from '@/models/item';
import { Modal } from '@/components/modals/modal/modal';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { PanelMode } from '@/enums/panel-mode';
import { PlusOutlined } from '@ant-design/icons';
import { Project } from '@/models/project';
import { ProjectLogic } from '@/logic/project-logic';
import { ProjectPanel } from '@/components/panels/elements/project-panel/project-panel';
import { ProjectSelectModal } from '@/components/modals/select/project-select/project-select-modal';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './hero-projects-modal.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onClose: () => void;
	onChange: (hero: Hero) => void;
	onCustomize: () => void;
}

export const HeroProjectsModal = (props: Props) => {
	const [ hero, setHero ] = useState<Hero>(Utils.copy(props.hero));
	const [ projectsVisible, setProjectsVisible ] = useState<boolean>(false);

	const setProjectPoints = (value: number) => {
		const copy = Utils.copy(hero);
		copy.state.projectPoints = value;
		setHero(copy);
		props.onChange(copy);
	};

	const addProject = (project: Project) => {
		const projectCopy = Utils.copy(project);
		projectCopy.progress = FactoryLogic.createProjectProgress();

		const copy = Utils.copy(hero);
		copy.state.projects.push(projectCopy);
		setHero(copy);
		setProjectsVisible(false);
		props.onChange(copy);
	};

	const changeProject = (project: Project) => {
		const copy = Utils.copy(hero);
		const index = copy.state.projects.findIndex(p => p.id === project.id);
		copy.state.projects[index] = project;
		setHero(copy);
		props.onChange(copy);
	};

	const deleteProject = (project: Project) => {
		const copy = Utils.copy(hero);
		copy.state.projects = copy.state.projects.filter(p => p.id !== project.id);
		setHero(copy);
		props.onChange(copy);
	};

	const addItemAndDeleteProject = (item: Item, project: Project) => {
		const copy = Utils.copy(hero);
		copy.state.inventory.push(item);
		copy.state.projects = copy.state.projects.filter(p => p.id !== project.id);
		setHero(copy);
		props.onChange(copy);
	};

	return (
		<Modal
			content={
				<div className='hero-projects-modal'>
					<Space orientation='vertical' style={{ width: '100%', paddingBottom: '20px' }}>
						<HeaderText
							extra={
								<Button type='text' icon={<PlusOutlined />} onClick={() => setProjectsVisible(true)} />
							}
						>
							Projects
						</HeaderText>
						<NumberSpin
							label='Project Points'
							value={hero.state.projectPoints}
							steps={[ 1, 10 ]}
							format={() => HeroLogic.getProjectPoints(hero).toString()}
							onChange={setProjectPoints}
						/>
						<Divider />
						{
							hero.state.projects.length === 0 ?
								<Empty text='You have no projects underway.' />
								:
								<GroupedItemList
									items={hero.state.projects}
									renderTitle={p => p.name}
									renderTags={p => [ ProjectLogic.getStatus(p) ]}
									renderExtra={p => [
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteProject(p); }} />
									]}
									renderContent={p => (
										<ProjectPanel
											project={p}
											hero={hero}
											sourcebooks={props.sourcebooks}
											mode={PanelMode.Full}
											onChange={changeProject}
											addItemAndDeleteProject={addItemAndDeleteProject}
										/>
									)}
									onChange={updated => {
										const copy = Utils.copy(hero);
										copy.state.projects = updated;
										setHero(copy);
										props.onChange(copy);
									}}
								/>
						}
					</Space>
					<Drawer open={projectsVisible} onClose={() => setProjectsVisible(false)} closeIcon={null} size={500}>
						<ProjectSelectModal
							sourcebooks={props.sourcebooks}
							onSelect={addProject}
							onCustomize={props.onCustomize}
							onClose={() => setProjectsVisible(false)}
						/>
					</Drawer>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
