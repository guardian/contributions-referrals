import SSM = require('aws-sdk/clients/ssm');
import {Pool, QueryResult} from 'pg';

import {writeReferralCode} from '../lib/db';
import {getDatabaseParamsFromSSM, getParamFromSSM, ssmStage} from '../../lib/ssm';
import {logInfo, logWarning} from '../../lib/log';
import {ReferralCreatedEvent} from "../lib/models";
import {getBrazeUuidByEmail} from "../lib/identity";
import {createDatabaseConnectionPool} from "../../lib/db";

const AWS = require('aws-sdk');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});

const dbConnectionPool: Promise<Pool> =
    getDatabaseParamsFromSSM(ssm).then(createDatabaseConnectionPool);
const identityAccessToken: Promise<string> =
    getParamFromSSM(ssm, `/contributions-referrals/idapi/${ssmStage}/accessToken`);

export async function handler(event: any, context: any): Promise<number> {
    const parsedEvents: any[] = event.Records.map((event: any) => JSON.parse(event.body));
    logInfo('parsed: ', parsedEvents);

    return Promise.all(
        parsedEvents.map(parsedEvent =>
            resolveBrazeUuid(parsedEvent).then(validatedEvent =>
                validatedEvent ?
                    persist(validatedEvent) :
                    Promise.reject(`Failed to validate an event.`)
            )
        )
    ).then(results => results.length);
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

async function persist(referralEvent: ReferralCreatedEvent): Promise<QueryResult> {
    return dbConnectionPool.then(pool => writeReferralCode(referralEvent, pool));
}
