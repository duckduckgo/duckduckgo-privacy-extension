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
