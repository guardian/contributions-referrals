import {isRunningLocally} from "../../create-code/lib/stage";

interface Request {
    braze_uuid: string,
    campaign_id: string,
    from_date: string  // TODO - what does braze send?
}

// function validate(request: any): Request | null {
//     if (!!request.braze_uuid && !!request.campaign_id && !!request.from_date) {
//         return request;
//     } else {
//
//     }
// }

export async function handler(event: any, context: any): Promise<string> {
    const parsedEvent = isRunningLocally() ? event : JSON.parse(event.body);
    console.log(parsedEvent);
    return Promise.resolve("fin");
}
