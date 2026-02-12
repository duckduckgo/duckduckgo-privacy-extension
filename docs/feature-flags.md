# Feature Flags

This guide covers how feature flags work in the DuckDuckGo browser extension and how they connect to the remote privacy configuration.

For the cross-platform overview of the remote config system, see the [Feature Flagging Guide](https://github.com/duckduckgo/privacy-configuration/blob/main/docs/feature-flagging-guide.md) in the privacy-configuration repo.

## Architecture

Unlike native clients, the extension does not have a separate feature flag enum. The remote privacy configuration (`extension-config.json`) **is** the feature flag system. Feature state, sub-feature state, exceptions, rollouts, targets, and cohorts are all read directly from the config JSON at runtime.

The extension fetches `extension-config.json` from CDN (with a bundled fallback) and evaluates feature state using utility functions in `shared/js/background/utils.js`.

## How Features Are Controlled

Each feature in the config has a `state` (`"enabled"`, `"disabled"`, `"internal"`) and optional `exceptions` (sites where the feature is disabled). Sub-features support additional properties like `rollout`, `targets`, and `cohorts`.

The extension evaluates feature state with:

```javascript
import { isFeatureEnabled, getFeatureSettings } from './utils'

// Check if a top-level feature is enabled
if (isFeatureEnabled('contentBlocking')) {
    // ...
}

// Get feature settings
const settings = getFeatureSettings('autofill')
```

Sub-feature state is resolved by the `RemoteConfig` component (`shared/js/background/components/remote-config.js`), which handles rollout evaluation, target matching, and cohort assignment.

## Adding a New Feature

1. Add the feature to the privacy-configuration repo (in `features/` and/or `overrides/extension-override.json`).
2. Read its state at runtime using `isFeatureEnabled()` or the `RemoteConfig` component for sub-feature evaluation.
3. No client-side enum or registration is needed -- the extension reads features dynamically from the config.

## Testing Config Changes Locally

During development, you can point the extension at a local config:

1. Modify `shared/data/constants.js` to point to `http://localhost:8080/generated/v2/extension-config.json`.
2. Serve the config locally:

```sh
cd /path/to/privacy-configuration
node index.js
http-server
```

3. Bundle the config into the extension: `npm run bundle-config`.

See `CONTRIBUTING.md` for more on development builds.

## File Locations

| What | Path |
|---|---|
| Remote config component | `shared/js/background/components/remote-config.js` |
| Feature state utilities | `shared/js/background/utils.js` |
| Bundled config fallback | `shared/data/bundled/extension-config.json` |
| Config URL constants | `shared/data/constants.js` |
| Protection debugger | See [Protection Debugging](./protection-debugger.md) for toggling features at runtime |

## Related Documentation

- [Feature Flagging Guide (cross-platform)](https://github.com/duckduckgo/privacy-configuration/blob/main/docs/feature-flagging-guide.md)
- [Protection Debugging](./protection-debugger.md)
