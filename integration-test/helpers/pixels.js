import { logPageRequests } from './requests';
import { _formatPixelRequestForTesting } from '../../shared/js/shared-utils/pixels';

const expectedBrowserSuffix = /_chrome$/;

// Most pixel names have a suffix something like "_extension_chrome", the
// exception being breakage report pixels, which end with just something like
// "_chrome".
export const pixelBrowserSuffix = '_BROWSER';
export const pixelSuffix = '_extension' + pixelBrowserSuffix;

function requestIsPixel(request) {
    return request?.url?.hostname === 'improving.duckduckgo.com';
}

function formatPixelRequest(request) {
    const pixel = _formatPixelRequestForTesting(request.url);

    // Replace browser suffix with placeholder, so that the pixel tests can run
    // against all platforms.
    // Note: Only replace pixel suffix if it is correct, to ensure later
    //       assertions fail otherwise.
    if (pixel?.name) {
        pixel.name = pixel.name.replace(expectedBrowserSuffix, pixelBrowserSuffix);
    }

    return pixel;
}

export function logPixels(backgroundPage, page, pixelRequests, filter) {
    return logPageRequests(backgroundPage, page, pixelRequests, requestIsPixel, formatPixelRequest, filter);
}

export function listenForBreakageReport(backgroundPage, backgroundNetworkContext) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
        const cleanup = await logPixels(backgroundPage, backgroundNetworkContext, [], (pixel) => {
            if (pixel.name.startsWith('epbf_')) {
                resolve(pixel);
                cleanup();
            }
        });
    });
}
