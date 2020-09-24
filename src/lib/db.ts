import {Pool, QueryConfig, QueryResult} from 'pg';
import {logInfo} from "./log";

export type DBConfig = {
    username: string,
    url: string,
    password: string
};

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

function queryToString(queryConfig: QueryConfig): string {
    return `Query: ${JSON.stringify(queryConfig)}`;
}

export function handleQuery(
    queryPromise: Promise<QueryResult>,
    queryConfig: QueryConfig,
): Promise<QueryResult> {
    return queryPromise.then((result: QueryResult) => {
        logInfo(`${queryToString(queryConfig)}. Affected ${result.rowCount} row(s): `, result.rows);
        return result;
    })
}
