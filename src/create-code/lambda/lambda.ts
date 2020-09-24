import SSM = require('aws-sdk/clients/ssm');
import {Pool} from 'pg';

import {writeReferralCode} from '../lib/db';
import {getDatabaseParamsFromSSM, getParamFromSSM, ssmStage} from '../../lib/ssm';
import {logError, logInfo, logWarning} from '../../lib/log';
import {isRunningLocally} from "../../lib/stage";
import {ReferralCreatedEvent} from "../lib/models";
import {getBrazeUuidByEmail} from "../lib/identity";
import {createDatabaseConnectionPool} from "../../lib/db";

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*"
};

const AWS = require('aws-sdk');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});

const dbConnectionPool: Promise<Pool> =
    getDatabaseParamsFromSSM(ssm).then(createDatabaseConnectionPool);
const identityAccessToken: Promise<string> =
    getParamFromSSM(ssm, `/contributions-referrals/idapi/${ssmStage}/accessToken`);

export async function handler(event: any, context: any): Promise<object> {
    logInfo('event: ', event);
    const parsedEvent = isRunningLocally() ? event : JSON.parse(event.body);
    logInfo('parsed: ', parsedEvent);


    return resolveBrazeUuid(parsedEvent).then(validatedEvent =>
        validatedEvent ? persist(validatedEvent) : badRequest
    );
}

function resolveBrazeUuid(event: any): Promise<ReferralCreatedEvent | null> {
    if (!!event.email) {
        // We have an email, so first fetch user's brazeUuid with identity api
        return identityAccessToken
            .then(token => getBrazeUuidByEmail(event.email, token))
            .then(brazeUuid => validate({
                ...event,
                brazeUuid,
            }))
    } else {
        return Promise.resolve(validate(event));
    }
}

const referralCodePattern = /^[a-zA-Z0-9]*$/;

function validate(event: any): ReferralCreatedEvent | null {
    if (!!event.code &&
        referralCodePattern.test(event.code) &&
        !!event.brazeUuid &&
        !!event.source &&
        !!event.campaignId
    ) {
        return event
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

async function persist(referralEvent: ReferralCreatedEvent): Promise<object> {
    const queryResult = await dbConnectionPool.then(pool => writeReferralCode(referralEvent, pool));

    if (queryResult.rows.length > 0) {
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
