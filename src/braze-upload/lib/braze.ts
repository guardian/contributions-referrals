import {getParamFromSSM, ssmStage} from "../../lib/ssm";
import SSM = require("aws-sdk/clients/ssm");
import fetch from "node-fetch";

const brazeEndpoint = "https://rest.fra-01.braze.eu/users/track";

export const getBrazeKeyFromSsm = (ssm: SSM): Promise<string> =>
    getParamFromSSM(ssm, `/contributions-referrals/braze/${ssmStage}/api-key`);

export const sendCampaignIdsToBraze = async (campaignIds: string[], brazeUuid: string, brazeKey: string): Promise<any> => {
    const requestBody = {
        api_key: brazeKey,
        attributes: [{
            external_id: brazeUuid,
            unmanaged_contribution_referral_campaign_ids: campaignIds
        }]
    };

    const brazeRequest = {
        method: 'post',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    };

    return fetch(brazeEndpoint, brazeRequest)
        .then(response => {
            if (!response.ok) {
                return Promise.reject(new Error(`Braze responded with status: ${response.status}, ${JSON.stringify(response)}`));
            }
            return response.json();
        })
};
