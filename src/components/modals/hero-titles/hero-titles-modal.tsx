import { Button, Drawer, Space } from 'antd';
import { CreatureLogic } from '@/logic/creature-logic';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Empty } from '@/components/controls/empty/empty';
import { Expander } from '@/components/controls/expander/expander';
import { GroupedItemList } from '@/components/controls/grouped-item-list/grouped-item-list';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { Modal } from '@/components/modals/modal/modal';
import { PanelMode } from '@/enums/panel-mode';
import { PlusOutlined } from '@ant-design/icons';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Title } from '@/models/title';
import { TitlePanel } from '@/components/panels/elements/title-panel/title-panel';
import { TitleSelectModal } from '@/components/modals/select/title-select/title-select-modal';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './hero-titles-modal.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onClose: () => void;
	onChange: (hero: Hero) => void;
	onCustomize: () => void;
}

export const HeroTitlesModal = (props: Props) => {
	const [ hero, setHero ] = useState<Hero>(Utils.copy(props.hero));
	const [ titlesVisible, setTitlesVisible ] = useState<boolean>(false);

	const addTitle = (title: Title) => {
		const copy = Utils.copy(hero);
		copy.state.titles.push(Utils.copy(title));
		setHero(copy);
		setTitlesVisible(false);
		props.onChange(copy);
	};

	const changeTitle = (title: Title) => {
		const copy = Utils.copy(hero);
		const index = copy.state.titles.findIndex(t => t.id === title.id);
		copy.state.titles[index] = title;
		setHero(copy);
		props.onChange(copy);
	};

	const deleteTitle = (title: Title) => {
		const copy = Utils.copy(hero);
		copy.state.titles = copy.state.titles.filter(p => p.id !== title.id);
		setHero(copy);
		props.onChange(copy);
	};

	const echelon = CreatureLogic.getEchelon(hero.class?.level || 1);

	return (
		<Modal
			content={
				<div className='hero-titles-modal'>
					<Space orientation='vertical' style={{ width: '100%', paddingBottom: '20px' }}>
						<HeaderText
							extra={
								<Button type='text' icon={<PlusOutlined />} onClick={() => setTitlesVisible(true)} />
							}
						>
							Titles
						</HeaderText>
						<Expander title='Checklist'>
							<table>
								<thead>
									<tr>
										<th>Title</th>
										<th>Prerequisites</th>
									</tr>
								</thead>
								<tbody>
									{
										SourcebookLogic.getTitles(props.sourcebooks)
											.filter(title => title.echelon <= echelon)
											.map(title => (
												<tr key={title.id}>
													<td>{title.name}</td>
													<td>{title.prerequisites}</td>
												</tr>
											))
									}
								</tbody>
							</table>
						</Expander>
						{
							hero.state.titles.length === 0 ?
								<Empty text='You have no titles.' />
								:
								<GroupedItemList
									items={hero.state.titles}
									renderTitle={t => t.name}
									renderTags={t => [ `Echelon ${t.echelon}` ]}
									renderExtra={t => [
										<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteTitle(t); }} />
									]}
									renderContent={t => (
										<TitlePanel
											title={t}
											hero={hero}
											sourcebooks={props.sourcebooks}
											mode={PanelMode.Full}
											onChange={changeTitle}
										/>
									)}
									onChange={updated => {
										const copy = Utils.copy(hero);
										copy.state.titles = updated;
										setHero(copy);
										props.onChange(copy);
									}}
								/>
						}
					</Space>
					<Drawer open={titlesVisible} onClose={() => setTitlesVisible(false)} closeIcon={null} size={500}>
						<TitleSelectModal
							hero={hero}
							sourcebooks={props.sourcebooks}
							onSelect={addTitle}
							onCustomize={props.onCustomize}
							onClose={() => setTitlesVisible(false)}
						/>
					</Drawer>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
