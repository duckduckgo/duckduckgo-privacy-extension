import z from 'zod';
import constants from '../../data/constants';
const { events } = constants.trackerStats;

export const dataFormatSchema = z.object({
    atb: z.string().optional(),
    totalCount: z.number(),
    totalPeriod: z.enum(['install-time']),
    trackerCompaniesPeriod: z.enum(['last-hour', 'last-day']),
    trackerCompanies: z.array(
        z.object({
            displayName: z.string(),
            count: z.number(),
        }),
    ),
});

/**
 * Outgoing message: that means from the extension -> new tab page
 */
export const disconnectMessage = z.object({
    messageType: z.literal(events.outgoing.newTabPage_disconnect),
});

export const dataMessage = z.object({
    messageType: z.literal(events.outgoing.newTabPage_data),
    options: dataFormatSchema,
});

export const outgoing = z.discriminatedUnion('messageType', [dataMessage, disconnectMessage]);

/**
 * Incoming messages: that means from new tab page to the extension
 */
const heartbeatMessage = z.object({
    messageType: z.literal(events.incoming.newTabPage_heartbeat),
});
export const incoming = z.discriminatedUnion('messageType', [heartbeatMessage]);
