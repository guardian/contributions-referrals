import {Pool, QueryResult} from "pg";
import SSM = require("aws-sdk/clients/ssm");
import {
    fetchReferralData,
    fetchCampaignIds,
    writeSuccessfulReferral
} from "../lib/db";
import {getDatabaseParamsFromSSM} from "../../lib/ssm";
import {sendCampaignIdsToBraze} from "../lib/braze";
import {createDatabaseConnectionPool} from "../../lib/db";

const AWS = require('aws-sdk');
const acquisition_types = require('../gen-nodejs/acquisition_types');
const serializer = require('thrift-serializer');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});
const dbConnectionPool: Promise<Pool> =  getDatabaseParamsFromSSM(ssm).then(createDatabaseConnectionPool);

interface Event {
    Records: {
        kinesis: {
            data: any
        }
    }[]
}

const referralCodePattern = /^[a-zA-Z0-9]*$/;

const getReferralCodeFromThriftBytes = (rawThriftData: any): Promise<string | null> =>
    new Promise((resolve, reject) => {
        serializer.read(acquisition_types.Acquisition, rawThriftData, function (err: any, msg: any) {
            if (err) {
                reject(err);
            }
            console.log("event:", JSON.stringify(msg));

            const referralCodeParam = msg.queryParameters.find((qp: any) => qp.name === 'referralCode');
            if (!!referralCodeParam &&
                !!referralCodeParam.value &&
                referralCodePattern.test(referralCodeParam.value)
            ) {
                resolve(referralCodeParam.value as string);
            } else {
                resolve(null);
            }
        });
    });

export async function handler(event: Event, context: any): Promise<any> {
    console.log("events:", JSON.stringify(event));
    const pool = await dbConnectionPool;

    const maybeReferralCodes: (string | null)[] = await Promise.all(
        event.Records.map(record => getReferralCodeFromThriftBytes(record.kinesis.data))
    );

    const resultPromises = maybeReferralCodes
        .filter(maybeReferralCode => !!maybeReferralCode)
        .map(c => c as string)  // typescript doesn't know that the above line filters to strings only
        .map(async (referralCode: string) => {
            // Fetch the braze uuid
            const referralDataLookupResult: QueryResult = await fetchReferralData(referralCode, pool);

            const referralData = referralDataLookupResult.rows[0];
            if (!referralData) {
                return Promise.reject(`No brazeUuid found for referralCode ${referralCode}`);
            }

            // Write the successful referral
            const writeResult: QueryResult = await writeSuccessfulReferral(
                {
                    brazeUuid: referralData.braze_uuid,
                    referralCode: referralCode,
                    campaignId: referralData.campaign_id,
                },
                pool
            );
            if (writeResult.rows.length <= 0) {
                return Promise.reject(`Failed to write successful referral for code ${referralCode}`);
            }

            // Fetch the distinct set of campaignIds for this braze user
            const campaignIdsResult: QueryResult = await fetchCampaignIds(referralData.braze_uuid, pool);
            if (campaignIdsResult.rows.length <= 0) {
                return Promise.reject(`No campaignIds found for brazeUuid ${referralData.braze_uuid}`);
            }

            const campaignIds = campaignIdsResult.rows.map(row => row.campaign_id);

            return sendCampaignIdsToBraze(campaignIds, referralData.braze_uuid);
        });

    return Promise.all(resultPromises);
}
