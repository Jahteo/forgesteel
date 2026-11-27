import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { useHeroes, useSession } from '@/contexts/data-context';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { BackupRestorePanel } from '@/components/panels/backup/backup-restore-panel';
import { ConnectionSettings } from '@/models/connection-settings';
import { DataService } from '@/services/data-service';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroOverviewPanel } from '@/components/panels/hero-overview/hero-overview-panel';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Session } from '@/models/session';
import { SessionFilePanel } from '@/components/panels/backup/session-file-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookPanel } from '@/components/panels/elements/sourcebook-panel/sourcebook-panel';
import { Utils } from '@/utils/utils';
import { useTitle } from '@/hooks/use-title';

import './backup-page.scss';

interface Props {
	homebrewSourcebooks: Sourcebook[];
	dataService: DataService;
	connectionSettings: ConnectionSettings;
	params: FooterParams;
	importSession: (session: Session) => void;
}

export const BackupPage = (props: Props) => {
	const heroes = useHeroes();
	const session = useSession();
	useTitle('Backup');

	return (
		<ErrorBoundary>
			<div className='backup-page'>
				<AppHeader subheader='Backup' />
				<div className='backup-page-content'>
					<div className='backup-page-sections'>
						<div className='backup-section'>
							<HeaderText level={1}>Everything</HeaderText>
							<BackupRestorePanel
								dataService={props.dataService}
								connectionSettings={props.connectionSettings}
							/>
						</div>
						<div className='backup-section'>
							<HeaderText level={1}>Session</HeaderText>
							<SessionFilePanel
								session={session}
								importSession={props.importSession}
							/>
						</div>
					</div>
					<HeaderText level={1}>Heroes and Sourcebooks</HeaderText>
					<div className='ds-text'>
						Click a hero or homebrew sourcebook to download it on its own. Heroes can be imported from the Heroes page, and sourcebooks from Library &gt; Sourcebooks.
					</div>
					<div className='backup-page-items'>
						{
							heroes.map(hero => (
								<SelectablePanel key={hero.id} onSelect={() => Utils.exportData(hero.name || 'Unnamed Hero', hero, 'hero')}>
									<HeroOverviewPanel hero={HeroLogic.createOverview(hero)} />
								</SelectablePanel>
							))
						}
						{
							props.homebrewSourcebooks.map(sb => (
								<SelectablePanel key={sb.id} onSelect={() => Utils.exportData(sb.name || 'Unnamed Sourcebook', sb, 'sourcebook')}>
									<SourcebookPanel sourcebook={sb} sourcebooks={[]} />
								</SelectablePanel>
							))
						}
					</div>
					{
						heroes.length + props.homebrewSourcebooks.length === 0 ?
							<Empty text='No heroes or homebrew sourcebooks yet' />
							: null
					}
				</div>
				<AppFooter page='backup' params={props.params} />
			</div>
		</ErrorBoundary>
	);
};
