import {Pool, QueryConfig, QueryResult} from 'pg';
import {logError, logInfo} from '../lib/log';
import {ReferralCreatedEvent} from "./models";

export type DBConfig = {
    username: string,
    url: string,
    password: string
};

// just the most useful bits of the QueryResult type from the pg library
type QueryResultPartial = {
    command: string,
    rowCount: number,
    rows: any[]
}

export type QuerySuccess = { success: QueryResultPartial };
export type QueryError = { error: string };
export type QueryRes = QuerySuccess | QueryError

export function createDatabaseConnectionPool(dbConfig: DBConfig): Pool {
    const match = dbConfig.url.match(/\/\/(.*)\/(.*)/);
    if (match !== null) {
        const [_, host, database] = match;
        return new Pool({
            host,
            database,
            user: dbConfig.username,
            password: dbConfig.password,
            port: 5432,
        });
    }

    throw new Error(`Could not parse DB config ${JSON.stringify(dbConfig)}`);
}

export function referralCreatedEventToQueryConfig(record: ReferralCreatedEvent): QueryConfig {
    return {
        text: `
            INSERT INTO contribution_referral_codes(
                braze_uuid,
                source,
                referral_code,
                campaign_id
            ) VALUES (
                $1, $2, $3
            )
            RETURNING *;
        `,
        values: [
            record.brazeUuid,
            record.source,
            record.code,
            record.campaignId
        ]
    };
}

function queryToString(queryConfig: QueryConfig): string {
    return `Query: ${JSON.stringify(queryConfig)}`;
}

export function handleQuery(
    queryPromise: Promise<QueryResult>,
    queryConfig: QueryConfig,
): Promise<QueryRes> {
    return queryPromise
        .then((result: QueryResult) => {
            logInfo(`${queryToString(queryConfig)}. Affected ${result.rowCount} row(s): `, result.rows);
            return {
                success: {
                    command: result.command,
                    rowCount: result.rowCount,
                    rows: result.rows,
                }
            };
        })
        .catch((err: Error) => {
            logError(`${queryToString(queryConfig)}. Error executing query`, err, err.stack);
            return ({
                error: err.message
            });
        });
}
