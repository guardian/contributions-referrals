import { handler } from "./lambda";

const AWS = require('aws-sdk');

process.env.AWS_PROFILE = 'membership';
const credentials = new AWS.SharedIniFileCredentials({profile: 'membership'});

AWS.config.credentials = credentials;
AWS.config.region = 'eu-west-1';

async function run() {
    process.env.Stage = 'DEV';
    await handler({}, null)
        .then(result => {
            console.log('Result: ', result);
        })
        .catch(err => {
            console.log('Failed to run locally: ', err);
        })
}

run();
