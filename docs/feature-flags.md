# Feature Flags

The extension does not have a separate feature flag layer. The remote privacy configuration (`extension-config.json`) **is** the feature flag system -- features are read directly from the config JSON at runtime.

Top-level feature state is checked via [`isFeatureEnabled()`](../shared/js/background/utils.js). Sub-feature evaluation (rollouts, targets, cohorts) is handled by the [`RemoteConfig`](../shared/js/background/components/remote-config.js) component.

For the cross-platform overview of the remote config system, see the [Feature Flagging Guide](https://github.com/duckduckgo/privacy-configuration/blob/main/docs/feature-flagging-guide.md).

## Adding a New Feature

1. Add the feature in the [privacy-configuration](https://github.com/duckduckgo/privacy-configuration) repo (`features/` and/or `overrides/extension-override.json`).
2. Read its state at runtime -- no client-side registration needed.

## Testing Locally

Point the extension at a local config by modifying [`shared/data/constants.js`](../shared/data/constants.js), serving the config (`node index.js && http-server` in the privacy-configuration repo), and running `npm run bundle-config`. See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for more.

## Related Documentation

- [Feature Flagging Guide (cross-platform)](https://github.com/duckduckgo/privacy-configuration/blob/main/docs/feature-flagging-guide.md)
- [Protection Debugging](./protection-debugger.md) -- toggling features at runtime
