const AWS = require('aws-sdk');
// TODO - resolve thrift -> thrift/src/thrift
// const Thrift = require('thrift/src/thrift');
const Thrift = require('thrift');
const acquisition_types = require('../gen-nodejs/acquisition_types');

export async function handler(event: any, context: any): Promise<null> {
    console.log("events:", event.Records.length);
    event.Records.map(record => {
        const payload = new Buffer(record.kinesis.data, 'base64');
        console.log("payload", payload);
        const transport = new Thrift.TFramedTransport(payload);
        const protocol = new Thrift.TCompactProtocol(transport);
        const acquisition = new acquisition_types.Event();

        const result = acquisition.read(protocol);
        console.log("result",result)
    });
    return Promise.resolve(null);
}
