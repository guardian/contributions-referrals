import {handler} from './lambda';
import {logError, logInfo} from '../../lib/log';

const AWS = require('aws-sdk');
const fs = require('fs');

/**
 * For testing locally:
 * `yarn run local`
 */
AWS.config = new AWS.Config();

// Get the credentials from ~/.aws/credentials
// This doesn't work unless I set process.env.AWS_PROFILE, even though according to
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
// it should be enough to just pass {profile: 'membership'} to SharedIniFileCredentials.
process.env.AWS_PROFILE = 'membership';
const credentials = new AWS.SharedIniFileCredentials({profile: 'membership'});

AWS.config.credentials = credentials;
AWS.config.region = 'eu-west-1';

const dummyInputFile = './src/create-code/dummy-input.txt';

async function run() {
    process.env.Stage = 'DEV';
    let input;
    try {
        const fileContents = fs.readFileSync(dummyInputFile, 'utf8');
        input = JSON.parse(fileContents);
    } catch (err) {
        logInfo(`error parsing ${dummyInputFile}`, err);
    }

    if (input) {
        const event = {
            Records: [
                {
                    body: JSON.stringify(input)
                }
            ]
        };
        await handler(event, null)
            .then(result => {
                logInfo('============================');
                logInfo('Result: ', result);
            })
            .catch(err => {
                logInfo('============================');
                logError('Failed to run locally: ', err);
            })
    }
}

run();
