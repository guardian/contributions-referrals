import {Pool, QueryResult} from "pg";
import SSM = require("aws-sdk/clients/ssm");
import {createDatabaseConnectionPool, fetchReferralData, writeSuccessfulReferral} from "../lib/db";
import {getParamsFromSSM} from "../lib/ssm";

const AWS = require('aws-sdk');
const acquisition_types = require('../gen-nodejs/acquisition_types');
const serializer = require('thrift-serializer');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});
const dbConnectionPool: Promise<Pool> =  getParamsFromSSM(ssm).then(createDatabaseConnectionPool);

interface Event {
    Records: {
        kinesis: {
            data: any
        }
    }[]
}

const getReferralCodeFromThriftBytes = (rawThriftData: any): Promise<string | null> =>
    new Promise((resolve, reject) => {
        serializer.read(acquisition_types.Acquisition, rawThriftData, function (err, msg) {
            if (err) {
                reject(err);
            }
            console.log("event:", JSON.stringify(msg));

            const referralCodeParam = msg.queryParameters.find(qp => qp.name === 'referralCode');
            if (!!referralCodeParam && !!referralCodeParam.value) {
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
        .map(referralCode =>
            fetchReferralData(referralCode, pool)
                .then((queryResult: QueryResult) => {
                    // TODO - write to contribution_successful_referrals table and send to Braze
                    const row = queryResult.rows[0];
                    if (row) {
                        return writeSuccessfulReferral(
                            {
                                brazeUuid: row.braze_uuid,
                                referralCode: referralCode,
                                campaignId: row.campaign_id,
                            },
                            pool
                        );
                    } else {
                        return Promise.reject(`No brazeUuid found for referralCode ${referralCode}`);
                    }
                })
                .then(result => {
                    console.log(result)
                })
        );

    return Promise.all(resultPromises);
}
