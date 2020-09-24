import {logInfo} from "../../lib/log";
import {isRunningLocally} from "../../lib/stage";

interface ReferralCountRequest {
    brazeUuid: string,
    campaignId: string,
    fromDate: string  //TODO - or a number?
}

export async function handler(event: any, context: any): Promise<object> {
    logInfo('event: ', event);
    const parsedQueryString = isRunningLocally() ? event : JSON.parse(event.queryStringParameters);
    logInfo('parsed: ', parsedQueryString);
    return parsedQueryString;
}
