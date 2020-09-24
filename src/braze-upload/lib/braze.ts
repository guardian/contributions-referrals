import {getParamFromSSM, ssmStage} from "../../lib/ssm";
import SSM = require("aws-sdk/clients/ssm");

const AWS = require('aws-sdk');
const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});

const brazeEndpoint = "https://rest.fra-01.braze.eu/users/track";

const brazeKey: Promise<string> = getParamFromSSM(ssm, `contributions-referrals/braze/${ssmStage}/api-key`);

export const sendCampaignIdsToBraze = (campaignIds: string[], brazeUuid: string): Promise<any> => {
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
                return Promise.reject(new Error(`Braze responded with ${response}`));
            }
            return response.json();
        })
};
