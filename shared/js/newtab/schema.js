import { array, discriminatedUnion, enum as zodEnum, literal, number, object, string } from 'zod';
import constants from '../../data/constants';
const { events } = constants.trackerStats;

export const dataFormatSchema = object({
    atb: string().optional(),
    totalCount: number(),
    totalPeriod: zodEnum(['install-time']),
    trackerCompaniesPeriod: zodEnum(['last-hour', 'last-day']),
    trackerCompanies: array(
        object({
            displayName: string(),
            count: number(),
        }),
    ),
});

/**
 * Outgoing message: that means from the extension -> new tab page
 */
export const disconnectMessage = object({
    messageType: literal(events.outgoing.newTabPage_disconnect),
});

export const dataMessage = object({
    messageType: literal(events.outgoing.newTabPage_data),
    options: dataFormatSchema,
});

export const outgoing = discriminatedUnion('messageType', [dataMessage, disconnectMessage]);

/**
 * Incoming messages: that means from new tab page to the extension
 */
const heartbeatMessage = object({
    messageType: literal(events.incoming.newTabPage_heartbeat),
});
export const incoming = discriminatedUnion('messageType', [heartbeatMessage]);
