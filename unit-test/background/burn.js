import { clearBurnedState } from '../../shared/js/background/components/burn';
import Companies from '../../shared/js/background/companies';
import tabManager from '../../shared/js/background/tab-manager';
import { TabState } from '../../shared/js/background/classes/tab-state';

describe('burn', () => {
    beforeEach(() => {
        spyOn(Companies, 'resetData');
        spyOn(TabState, 'delete');
        tabManager.tabContainer = {};
        tabManager.swContainer = {};
    });

    it('clears the tracker counts and every tab', () => {
        const removeDNR = jasmine.createSpy('removeDNR');
        tabManager.tabContainer[1] = { adClick: { removeDNR } };
        tabManager.tabContainer[2] = { adClick: null };
        tabManager.swContainer['https://example.com'] = {};

        clearBurnedState('in-session');

        expect(Companies.resetData).toHaveBeenCalled();
        expect(tabManager.tabContainer).toEqual({});
        expect(tabManager.swContainer).toEqual({});
        // Ad-click attribution allowlisting outlives the tab object otherwise.
        expect(removeDNR).toHaveBeenCalled();
        // Session-storage backups, keyed by the numeric tab id.
        expect(TabState.delete).toHaveBeenCalledWith(1);
        expect(TabState.delete).toHaveBeenCalledWith(2);
    });

    it('is safe to run twice, and with nothing to clear', () => {
        expect(() => {
            clearBurnedState('on-startup');
            clearBurnedState('on-startup');
        }).not.toThrow();
        expect(Companies.resetData).toHaveBeenCalledTimes(2);
    });
});
