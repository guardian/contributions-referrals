const thrift = require('thrift');
const acquisition_types = require('./gen-nodejs/acquisition_types');

export async function handler(event: any, context: any): Promise<null> {
    console.log("events:", event.Records.length);
    event.Records.map(record => {
        const payload = new Buffer(record.kinesis.data, 'base64');
        console.log("payload", payload);
        const transport = new thrift.TFramedTransport(payload);
        const protocol = new thrift.TCompactProtocol(transport);
        const acquisition = new acquisition_types.Event();

        const result = acquisition.read(protocol);
        console.log("result",result)
    });
    return Promise.resolve(null);
}
