const AWS = require('aws-sdk');
const acquisition_types = require('../gen-nodejs/acquisition_types');
const serializer = require('thrift-serializer');

export async function handler(event: any, context: any): Promise<null> {
    console.log("events:", JSON.stringify(event));
    event.Records.map(record => {
        serializer.read(acquisition_types.Acquisition, record.kinesis.data, function (err, msg) {
            if (err) {
                console.log("error", err)
            }
            console.log("result", JSON.stringify(msg));
        });
    });
    return Promise.resolve(null);
}
