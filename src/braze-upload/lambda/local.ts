import { handler } from "./lambda";
import {logInfo} from "../../lib/log";

const AWS = require('aws-sdk');
const fs = require('fs');

process.env.AWS_PROFILE = 'membership';
const credentials = new AWS.SharedIniFileCredentials({profile: 'membership'});

AWS.config.credentials = credentials;
AWS.config.region = 'eu-west-1';

async function run() {
    process.env.Stage = 'DEV';

    try {
        const fileContents = fs.readFileSync('./src/braze-upload/test-event.json', 'utf8');
        const input = JSON.parse(fileContents);

        await handler(input, null)
            .then(result => {
                console.log('Result: ', result);
            })
            .catch(err => {
                console.log('Failed to run locally: ', err);
            })
    } catch (err) {
        logInfo(`error parsing test event file`, err);
    }
}

run();
