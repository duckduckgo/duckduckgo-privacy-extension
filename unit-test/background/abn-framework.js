import { choseCohort } from '../../shared/js/background/components/remote-config';

describe('choseCohort', () => {
    it('picks the only cohort if there is only one available', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
        ];
        expect(choseCohort(cohorts, Math.random)).toEqual(cohorts[0]);
    });

    it('picks a cohort at random', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
            {
                name: 'treatment',
                weight: 1,
            },
        ];
        const chosen = choseCohort(cohorts, Math.random);
        expect(chosen).not.toBeFalsy();
        expect(['control', 'treatment'].includes(chosen.name)).toBeTrue();
    });

    it('picks each cohort with 50% probability', () => {
        const cohorts = [
            {
                name: 'control',
                weight: 1,
            },
            {
                name: 'treatment',
                weight: 1,
            },
        ];
        const allocatedCohorts = { control: 0, treatment: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            control: 50,
            treatment: 50,
        });
    });

    it('picks from 3 cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 1,
            },
            {
                name: 'b',
                weight: 1,
            },
            {
                name: 'c',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0, c: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 33,
            b: 34,
            c: 33,
        });
    });

    it('picks from 2 unbalanced cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 3,
            },
            {
                name: 'b',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 75,
            b: 25,
        });
    });

    it('picks from 3 unbalanced cohorts correctly', () => {
        const cohorts = [
            {
                name: 'a',
                weight: 2,
            },
            {
                name: 'b',
                weight: 1,
            },
            {
                name: 'c',
                weight: 1,
            },
        ];
        const allocatedCohorts = { a: 0, b: 0, c: 0 };
        for (let i = 0; i < 100; i++) {
            const chosen = choseCohort(cohorts, () => (0.5 + i) / 100);
            allocatedCohorts[chosen.name] += 1;
        }
        expect(allocatedCohorts).toEqual({
            a: 50,
            b: 25,
            c: 25,
        });
    });
});
