import { logPageRequests } from './requests';
import { _formatPixelRequestForTesting } from '../../shared/js/shared-utils/pixels';

function requestIsPixel(request) {
    return request?.url?.hostname === 'improving.duckduckgo.com';
}

function formatPixelRequest(request) {
    return _formatPixelRequestForTesting(request.url);
}

export function logPixels(page, pixelRequests, filter) {
    return logPageRequests(page, pixelRequests, requestIsPixel, formatPixelRequest, filter);
}

export function listenForBreakageReport(backgroundNetworkContext) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
        const cleanup = await logPixels(backgroundNetworkContext, [], (pixel) => {
            if (pixel.name.startsWith('epbf_')) {
                resolve(pixel);
                cleanup();
            }
        });
    });
}
