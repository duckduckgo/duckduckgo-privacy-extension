/**
 * The CPM top sites data is gitignored and built locally or by the Makefile, so type checks can't rely on the file.
 */
declare module '*/data/bundled/cpm-top-sites.json' {
    const topSites: import('../../shared/js/background/components/cpm-site-rank').TopSitesData;
    export default topSites;
}
