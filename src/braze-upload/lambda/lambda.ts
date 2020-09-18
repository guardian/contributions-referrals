import {Pool} from "pg";
import SSM = require("aws-sdk/clients/ssm");
import {createDatabaseConnectionPool, fetchReferralData} from "../lib/db";
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

export async function handler(event: Event, context: any): Promise<any> {
    console.log("events:", JSON.stringify(event));
    const pool = await dbConnectionPool;

    return event.Records.map(record => {
        const referralCodePromise: Promise<string> = new Promise((resolve, reject) => {
            serializer.read(acquisition_types.Acquisition, record.kinesis.data, function (err, msg) {
                if (err) {
                    reject(err);
                }
                console.log("event:", JSON.stringify(msg));

                const referralCodeParam = msg.queryParameters.find(qp => qp.name === 'referralCode');
                if (!!referralCodeParam && !!referralCodeParam.value) {
                    console.log("referralCode", referralCodeParam.value);
                    resolve(referralCodeParam.value as string);
                } else {
                    reject(new Error('Cannot find referralCode in event'))
                }
            });
        });

        // TODO - write to contribution_successful_referrals table and send to Braze
        return referralCodePromise.then((referralCode: string) => fetchReferralData(referralCode, pool))
    });
}
