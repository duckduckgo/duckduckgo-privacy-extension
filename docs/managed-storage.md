# Managed Storage

The extension supports pre-configuration of certain options in managed environments. See documentation for [Firefox](https://extensionworkshop.com/documentation/enterprise/adding-policy-support-to-your-extension/#distributing-your-policy) and [Chrome](https://www.chromium.org/administrators/) on how to configure extension policies.

The follow options can be configured via policy:
 * `hasSeenPostInstall` (boolean) - if true the post install page will not be shown when the extension is launched for the first time.

## Example

Following instructions from [here](https://extensionworkshop.com/documentation/enterprise/adding-policy-support-to-your-extension/), the following policy would disable the post install page in a Firefox install:

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "jid1-ZAdIEUB7XOzOJw@jetpack": {
          "hasSeenPostInstall": true
        }
      }
    }
  }
}
```
