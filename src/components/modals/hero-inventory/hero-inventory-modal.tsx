import { Alert, Button, Drawer, Space } from 'antd';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Empty } from '@/components/controls/empty/empty';
import { Expander } from '@/components/controls/expander/expander';
import { FeatureType } from '@/enums/feature-type';
import { GroupedItemList } from '@/components/controls/grouped-item-list/grouped-item-list';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Item } from '@/models/item';
import { ItemPanel } from '@/components/panels/elements/item-panel/item-panel';
import { ItemSelectModal } from '@/components/modals/select/item-select/item-select-modal';
import { ItemType } from '@/enums/item-type';
import { Modal } from '@/components/modals/modal/modal';
import { PanelMode } from '@/enums/panel-mode';
import { PlusOutlined } from '@ant-design/icons';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './hero-inventory-modal.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onClose: () => void;
	onChange: (hero: Hero) => void;
	onCustomize: () => void;
}

export const HeroInventoryModal = (props: Props) => {
	const [ hero, setHero ] = useState<Hero>(Utils.copy(props.hero));
	const [ shopVisible, setShopVisible ] = useState<boolean>(false);

	const addItem = (item: Item) => {
		const copy = Utils.copy(hero);
		copy.state.inventory.push(item);
		setHero(copy);
		setShopVisible(false);
		props.onChange(copy);
	};

	const changeItem = (item: Item) => {
		const copy = Utils.copy(hero);
		const index = copy.state.inventory.findIndex(i => i.id === item.id);
		copy.state.inventory[index] = item;
		setHero(copy);
		props.onChange(copy);
	};

	const deleteItem = (item: Item) => {
		const copy = Utils.copy(hero);
		copy.state.inventory = copy.state.inventory.filter(i => i.id !== item.id);
		setHero(copy);
		props.onChange(copy);
	};

	const featureItems = HeroLogic.getFeatures(hero)
		.map(f => f.feature)
		.filter(f => f.type === FeatureType.ItemChoice)
		.flatMap(f => f.data.selected);

	let warning = null;
	const allItems = [ ...hero.state.inventory, ...featureItems ];
	if (allItems.filter(i => [ ItemType.Leveled, ItemType.LeveledArmor, ItemType.LeveledImplement, ItemType.LeveledWeapon ].includes(i.type)).length > 3) {
		warning = (
			<Alert
				type='warning'
				showIcon={true}
				title='You can only use 3 leveled items at a time.'
			/>
		);
	}

	return (
		<Modal
			content={
				<div className='hero-inventory-modal'>
					<Space orientation='vertical' style={{ width: '100%', paddingBottom: '20px' }}>
						<HeaderText
							extra={
								<Button type='text' icon={<PlusOutlined />} onClick={() => setShopVisible(true)} />
							}
						>
							Inventory
						</HeaderText>
						{warning}
						<GroupedItemList
							items={hero.state.inventory}
							renderTitle={i => i.count === 1 ? i.name : `${i.name} (x${i.count})`}
							renderTags={i => [ i.type ]}
							renderExtra={i => [
								<DangerButton key='delete' mode='clear' onConfirm={e => { e.stopPropagation(); deleteItem(i); }} />
							]}
							renderContent={i => (
								<ItemPanel
									item={i}
									wielder={hero}
									sourcebooks={props.sourcebooks}
									mode={PanelMode.Full}
									onChange={changeItem}
								/>
							)}
							onChange={updated => {
								const copy = Utils.copy(hero);
								copy.state.inventory = updated;
								setHero(copy);
								props.onChange(copy);
							}}
						/>
						{
							featureItems.length > 0 ?
								<>
									<HeaderText>From Features</HeaderText>
									{featureItems.map(i => (
										<Expander
											key={i.id}
											title={i.count === 1 ? i.name : `${i.name} (x${i.count})`}
											tags={[ i.type ]}
										>
											<ItemPanel
												item={i}
												wielder={hero}
												sourcebooks={props.sourcebooks}
												mode={PanelMode.Full}
											/>
										</Expander>
									))}
								</>
								: null
						}
						{
							hero.state.inventory.length === 0 && featureItems.length === 0 ?
								<Empty text='Your inventory is empty.' />
								: null
						}
					</Space>
					<Drawer open={shopVisible} onClose={() => setShopVisible(false)} closeIcon={null} size={500}>
						<ItemSelectModal
							types={[ ItemType.Artifact, ItemType.Consumable1st, ItemType.Consumable2nd, ItemType.Consumable3rd, ItemType.Consumable4th, ItemType.ImbuedArmor, ItemType.ImbuedImplement, ItemType.ImbuedWeapon, ItemType.Leveled, ItemType.LeveledArmor, ItemType.LeveledImplement, ItemType.LeveledWeapon, ItemType.Trinket1st, ItemType.Trinket2nd, ItemType.Trinket3rd, ItemType.Trinket4th ]}
							sourcebooks={props.sourcebooks}
							hero={hero}
							onSelect={addItem}
							onCustomize={props.onCustomize}
							onClose={() => setShopVisible(false)}
						/>
					</Drawer>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
