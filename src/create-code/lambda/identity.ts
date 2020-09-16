import fetch from "node-fetch";
import {Response as FetchResponse} from "node-fetch";
import {isProd} from "../../lib/stage";

const idapiBaseUrl = isProd() ? "https://idapi.theguardian.com" : "https://idapi.code.dev-theguardian.com";

export function getBrazeUuidByEmail(email: string, accessToken: string): Promise<string> {
    return fetch(
    `${idapiBaseUrl}/user?emailAddress=${email}`,
    {
        headers: {"X-GU-ID-Client-Access-Token": `Bearer ${accessToken}`}
    }).then((response: FetchResponse) => {
        if (response.status == 404) {
            return Promise.reject(new Error(`Email not found: ${email}`));
        }
        if (!response.ok) {
            return Promise.reject(new Error(`Identity API user endpoint responded with status: ${response.status}`));
        }
        return response.json();
    }).then((identityResponse) => {
        if (identityResponse.user && identityResponse.user.privateFields && identityResponse.user.privateFields.brazeUuid) {
            return Promise.resolve(identityResponse.user.privateFields.brazeUuid);
        }
        // const uuid = identityResponse.user?.privateFields?.brazeUuid;

        // if (uuid) return Promise.resolve(uuid);
        else return Promise.reject(`Missing brazeUuid in identity API response: ${JSON.stringify(identityResponse)}`)
    })
}
