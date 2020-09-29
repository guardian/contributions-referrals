import {logError, logInfo} from "../../lib/log";
import {Pool, QueryResult} from "pg";
import {getDatabaseParamsFromSSM} from "../../lib/ssm";
import {createDatabaseConnectionPool} from "../../lib/db";
import SSM = require("aws-sdk/clients/ssm");
import {ApiGatewayResponse, ReferralCountRequest} from "../lib/models";
import {fetchReferralCount} from "../lib/db";

const AWS = require('aws-sdk');

const ssm: SSM = new AWS.SSM({region: 'eu-west-1'});

const dbConnectionPoolPromise: Promise<Pool> =
    getDatabaseParamsFromSSM(ssm).then(createDatabaseConnectionPool);

const headers = {
    "Content-Type": "application/json"
};

function parseRequest(request: any): ReferralCountRequest | null {
    const timestamp = Date.parse(request.fromDate);
    if (request.brazeUuid && request.campaignId && !isNaN(timestamp)) {
        return {
            brazeUuid: request.brazeUuid,
            campaignId: request.campaignId,
            fromDate: new Date(timestamp)
        }
    } else {
        return null;
    }
}

function processRequest(params: ReferralCountRequest, pool: Pool): Promise<ApiGatewayResponse> {
    return fetchReferralCount(params, pool)
        .then((queryResult: QueryResult) => {
            if (queryResult.rows[0] && queryResult.rows[0].referrals) {
                const referrals = queryResult.rows[0].referrals;
                return Promise.resolve({
                    statusCode: 200,
                    body: JSON.stringify({referrals}),
                    headers
                });
            } else {
                return Promise.reject(new Error(`No rows returned by query: ${queryResult}`));
            }
        })
        .catch((error: Error) => {
            logError(`Error fetching referral counts for brazeUuid ${params.brazeUuid}: ${error}`);
            return {
                statusCode: 500,
                body: "Internal server error",
                headers
            }
        })
}

export async function handler(event: any, context: any): Promise<ApiGatewayResponse> {
    const params = parseRequest(event.queryStringParameters);
    logInfo('parsed: ', params);

    if (params) {
        return dbConnectionPoolPromise.then(pool => processRequest(params, pool));
    } else {
        logError(`Failed to parse params: ${event.queryStringParameters}`);
        return {
            statusCode: 400,
            body: "Invalid request",
            headers
        };
    }
}
