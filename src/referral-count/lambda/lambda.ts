import {logInfo} from "../../lib/log";
import {isRunningLocally} from "../../lib/stage";

interface ReferralCountRequest {
    braze_uuid: string,
    campaign_id: string,
    from_date: string  //TODO - or a number?
}

export async function handler(event: any, context: any): Promise<object> {
    logInfo('event: ', event);
    const parsedEvent = isRunningLocally() ? event : JSON.parse(event.body);
    logInfo('parsed: ', parsedEvent);
    return parsedEvent;
}
