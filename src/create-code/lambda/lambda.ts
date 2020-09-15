import SSM = require('aws-sdk/clients/ssm');
import {Pool, QueryConfig} from 'pg';

import {
    createDatabaseConnectionPool,
    handleQuery,
    QueryRes,
    QuerySuccess,
    referralCreatedEventToQueryConfig
} from './db';
import {getParamsFromSSM} from '../../lib/ssm';
import {logError, logInfo, logWarning} from '../../lib/log';
import {isRunningLocally} from "../../lib/stage";
import {ReferralCreatedEvent} from "./models";
import * as process from "process";

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*"
};

const AWS = require('aws-sdk');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});
const dbConnectionPool: Promise<Pool> =  getParamsFromSSM(ssm).then(createDatabaseConnectionPool);

export async function handler(event: any, context: any): Promise<object> {
    logInfo('Stage: ', process.env.Stage);
    logInfo('event: ', event);
    const parsedEvent = isRunningLocally() ? event : JSON.parse(event.body);
    logInfo('parsed: ', parsedEvent);

    const validatedEvent = validate(parsedEvent);
    return validatedEvent ? persist(validatedEvent) : badRequest
}

function validate(event: any): ReferralCreatedEvent | null {
    if (!!event.code && !!event.email && !!event.source) {
        return {
            code: event.code,
            source: event.source,
            email: event.email
        };
    } else {
        logWarning('Failed to parse event: ', event);
        return null
    }
}

const badRequest = {
    headers,
    statusCode: 400,
    body: JSON.stringify('Bad Request')
};

export function isQuerySuccess(res: QueryRes): res is QuerySuccess {
    return Object.keys(res).some(k => k === 'success');
}

async function persist(referralEvent: ReferralCreatedEvent): Promise<object> {
    const newQueryConfig: QueryConfig = referralCreatedEventToQueryConfig(referralEvent);
    const queryResult = await dbConnectionPool.then(cp => handleQuery(cp.query(newQueryConfig), newQueryConfig));
    const isPersisted = isQuerySuccess(queryResult);

    if (isPersisted) {
        return res
    } else {
        logError('Failed to persist: ', queryResult);
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify('Internal Server Error'),
        }
    }
}

const res = {
    headers,
    statusCode: 200
};
