import { logPageRequests } from './requests';
import { _formatPixelRequestForTesting } from '../../shared/js/shared-utils/pixels';

function requestIsPixel(request) {
    return request?.url?.hostname === 'improving.duckduckgo.com';
}

function formatPixelRequest(request) {
    return _formatPixelRequestForTesting(request.url);
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
