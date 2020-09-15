
export async function handler(event: any, context: any): Promise<null> {
    console.log("events:", event.Records.length);
    event.Records.map(record => {
        const payload = new Buffer(record.kinesis.data, 'base64');
        console.log("payload", payload);
    });
    return Promise.resolve(null);
}
