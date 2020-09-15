const AWS = require('aws-sdk');
const Thrift = require('thrift');
const acquisition_types = require('../gen-nodejs/acquisition_types');

export async function handler(event: any, context: any): Promise<null> {
    console.log("events:", JSON.stringify(event));
    event.Records.map(record => {
        const payload = new Buffer(record.kinesis.data, 'base64');
        console.log("payload", payload);
        const transport = new Thrift.TFramedTransport(payload);
        const protocol = new Thrift.TCompactProtocol(transport);
        const acquisition = new acquisition_types.Acquisition();

        const result = acquisition.read(protocol);
        console.log("result",result)
    });
    return Promise.resolve(null);
}
