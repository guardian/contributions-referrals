import {DBConfig} from './db';
import {isProd, isRunningLocally} from './stage';

import SSM = require('aws-sdk/clients/ssm');

// locally, if process.env.Stage is not set, it will fetch CODE credentials from SSM
const ssmStage = isProd() ? 'PROD' : 'CODE';

export async function getParamsFromSSM(ssm: SSM): Promise<DBConfig> {
    const dbPath = `/contributions-referrals/db-config/${ssmStage}`;

    const ssmResponse = await ssm.getParametersByPath({
        Path: dbPath,
        WithDecryption: true
    }).promise();

    if (ssmResponse && ssmResponse.Parameters) {
        const p = ssmResponse.Parameters;
        const url = p.find(({Name}) => Name === `${dbPath}/url`);
        const password = p.find(({Name}) => Name === `${dbPath}/password`);
        const username = p.find(({Name}) => Name === `${dbPath}/username`);

        if (url && url.Value && password && password.Value && username && username.Value) {
            return {
                url: isRunningLocally() ? "jdbc:postgresql://localhost/contributions" : url.Value,
                password: password.Value,
                username: username.Value
            };
        }
    }

    throw new Error(`Could not get config from SSM path ${dbPath}`);
}
