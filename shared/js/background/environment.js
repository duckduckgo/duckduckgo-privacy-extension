/* global BUILD_TARGET */

export const IS_BLOCKING_WEBREQUEST_AVAILABLE = BUILD_TARGET === 'firefox';
export const SHOULD_USE_DNR = BUILD_TARGET === 'chrome';
