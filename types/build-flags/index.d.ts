/**
 * Types for build flags passed by ESBuild.
 * These values are injected at build time, based on the type of build being run.
 */

/** True iff this is a debug build */
declare const DEBUG: boolean;
/** True iff live extension reloading is enabled */
declare const RELOADER: boolean;
/** Platform the script is being built for */
declare const BUILD_TARGET: 'chrome' | 'firefox';
