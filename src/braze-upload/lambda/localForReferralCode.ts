import {processReferralCode} from "./lambda";
import {logInfo} from "../../lib/log";

const AWS = require('aws-sdk');

process.env.AWS_PROFILE = 'membership';
const credentials = new AWS.SharedIniFileCredentials({profile: 'membership'});

AWS.config.credentials = credentials;
AWS.config.region = 'eu-west-1';


const referralCode = process.argv[2];
console.log("referralCode", referralCode)

async function run() {
    process.env.Stage = 'DEV';

    try {
        await processReferralCode(referralCode)
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
