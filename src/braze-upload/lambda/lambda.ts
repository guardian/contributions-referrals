import {Pool, QueryResult} from "pg";
import SSM = require("aws-sdk/clients/ssm");
import {
    fetchReferralData,
    fetchCampaignIds,
    writeSuccessfulReferral
} from "../lib/db";
import {getDatabaseParamsFromSSM} from "../../lib/ssm";
import {getBrazeKeyFromSsm, sendCampaignIdsToBraze} from "../lib/braze";
import {createDatabaseConnectionPool} from "../../lib/db";
import {logInfo} from "../../lib/log";

const AWS = require('aws-sdk');
AWS.config.update({
    maxRetries: 1,
    httpOptions: {
        timeout: 20000,
        connectTimeout: 5000
    }
});
AWS.config.logger = console;
const acquisition_types = require('../gen-nodejs/acquisition_types');
const serializer = require('thrift-serializer');

const ssm: SSM = new AWS.SSM({
    region: 'eu-west-1',
    maxRetries: 1,
    logger: console,
    httpOptions: {
        timeout: 20000,
        connectTimeout: 5000
    }
});

interface LambdaDependencies {
    brazeKey: string,
    dbConnectionPool: Pool
}

const fetchDependencies = async (): Promise<LambdaDependencies> => {
    const dbConfig = await getDatabaseParamsFromSSM(ssm);
    const brazeKey = await getBrazeKeyFromSsm(ssm);

    return {
        brazeKey,
        dbConnectionPool: createDatabaseConnectionPool(dbConfig)
    }
};
console.log("dependenciesPromise...")
const dependenciesPromise: Promise<LambdaDependencies> = fetchDependencies();

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

            const referralCodeParam = msg.queryParameters && msg.queryParameters.find((qp: any) => qp.name === 'referralCode');
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

export const processReferralCode = async (referralCode: string): Promise<void> => {
    logInfo(`Processing referralCode ${referralCode}`);

    const {brazeKey, dbConnectionPool} = await dependenciesPromise;

    // Fetch the braze uuid
    const referralDataLookupResult: QueryResult = await fetchReferralData(referralCode, dbConnectionPool);

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
        dbConnectionPool
    );
    if (writeResult.rows.length <= 0) {
        return Promise.reject(`Failed to write successful referral for code ${referralCode}`);
    }

    // Fetch the distinct set of campaignIds for this braze user
    const campaignIdsResult: QueryResult = await fetchCampaignIds(referralData.braze_uuid, dbConnectionPool);
    if (campaignIdsResult.rows.length <= 0) {
        return Promise.reject(`No campaignIds found for brazeUuid ${referralData.braze_uuid}`);
    }

    const campaignIds = campaignIdsResult.rows.map(row => row.campaign_id);

    return sendCampaignIdsToBraze(campaignIds, referralData.braze_uuid, brazeKey);
};

export function handler(event: Event, context: any, callback: (err: Error | null, result?: number) => void) {
    // setTimeout is necessary because of a bug in the node lambda runtime which breaks requests to ssm
    setTimeout(async () => {
        const maybeReferralCodes: (string | null)[] = await Promise.all(
            event.Records.map(record => getReferralCodeFromThriftBytes(record.kinesis.data))
        );

        const resultPromises = maybeReferralCodes
            .filter(maybeReferralCode => !!maybeReferralCode)
            .map(c => c as string)  // typescript doesn't know that the above line filters to strings only
            .map(processReferralCode);

        Promise.all(resultPromises)
            .then(result => callback(null, result.length))
            .catch(err => callback(err));
    },0);
}
