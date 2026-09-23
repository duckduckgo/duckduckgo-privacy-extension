/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Based on https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/google-ads.js

(() => {
    /**
     * Bug 1713726 - Shim Ads by Google
     *
     * Sites relying on window.adsbygoogle may encounter breakage if it is blocked.
     * This shim provides a stub for that API to mitigate that breakage.
     */

    if (window.adsbygoogle?.loaded === undefined) {
        window.adsbygoogle = {
            loaded: true,
            push () {}
        };
    }

    if (window.gapi?._pl === undefined) {
        const stub = {
            go () {},
            render: () => ''
        };
        window.gapi = {
            _pl: true,
            additnow: stub,
            autocomplete: stub,
            backdrop: stub,
            blogger: stub,
            commentcount: stub,
            comments: stub,
            community: stub,
            donation: stub,
            family_creation: stub,
            follow: stub,
            hangout: stub,
            health: stub,
            interactivepost: stub,
            load () {},
            logutil: {
                enableDebugLogging () {}
            },
            page: stub,
            partnersbadge: stub,
            person: stub,
            platform: {
                go () {}
            },
            playemm: stub,
            playreview: stub,
            plus: stub,
            plusone: stub,
            post: stub,
            profile: stub,
            ratingbadge: stub,
            recobar: stub,
            savetoandroidpay: stub,
            savetodrive: stub,
            savetowallet: stub,
            share: stub,
            sharetoclassroom: stub,
            shortlists: stub,
            signin: stub,
            signin2: stub,
            surveyoptin: stub,
            visibility: stub,
            youtube: stub,
            ytsubscribe: stub,
            zoomableimage: stub
        };
    }

    const spoofAdElements = () => {
        const insElements = document.querySelectorAll('ins.adsbygoogle');
        for (let i = 0; i < insElements.length; i++) {
            const iframeId = 'aswift_' + (i + 1);
            const divId = iframeId + '_host';

            if (document.getElementById(divId) ||
                document.getElementById(iframeId)) {
                continue;
            }

            const iframeElement = document.createElement('iframe');
            iframeElement.style.setProperty('display', 'none', 'important');
            iframeElement.style.setProperty('visibility', 'collapse', 'important');
            iframeElement.id = iframeId;
            iframeElement.setAttribute('name', iframeId);
            iframeElement.setAttribute(
                'data-google-container-id', 'a!' + (i + 2)
            );
            iframeElement.setAttribute(
                'data-google-query-id', '00000000000000-00000000000'
            );
            iframeElement.setAttribute('data-load-complete', 'true');

            const divElement = document.createElement('div');
            divElement.style.setProperty('display', 'none', 'important');
            divElement.style.setProperty('visibility', 'collapse', 'important');
            divElement.id = divId;
            divElement.setAttribute('title', 'advertisement');
            divElement.setAttribute('aria-label', 'Advertisement');
            divElement.appendChild(iframeElement);

            const insElement = insElements[i];
            insElement.style.setProperty('display', 'none', 'important');
            insElement.style.setProperty('visibility', 'collapse', 'important');
            insElement.setAttribute('data-ad-format', 'auto');
            insElement.setAttribute('data-adsbygoogle-status', 'done');
            insElement.setAttribute('data-ad-status', 'filled');
            insElement.appendChild(divElement);
        }
    };

    if (document.readyState !== 'loading') {
        spoofAdElements();
    } else {
        window.addEventListener(
            'DOMContentLoaded', spoofAdElements, { once: true }
        );
    }
})();
