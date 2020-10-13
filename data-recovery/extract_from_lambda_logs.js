const fs = require('fs');
const zlib = require('zlib');

const folders = fs.readdirSync('exportedLogs')

const allRequests = folders
  .filter(file => fs.statSync('exportedLogs' + '/' + file).isDirectory())
  .flatMap(dir => {
    return fs.readdirSync('exportedLogs' + '/' + dir)
      .filter(fileName => /.gz$/.test(fileName))
      .flatMap(zipFile => {
        const data = fs.readFileSync('exportedLogs' + '/' + dir + '/' + zipFile);
        const unzippedData = zlib.gunzipSync(data).toString();
        return unzippedData.split(/^\d\d\d\d-\d\d-\d\dT/)
          .filter(record => /parsed/.test(record))
          .map(record => {
            const data = record.replace(/\r/g,'').substring(
              record.indexOf('{'),
              record.indexOf('}') + 1
            );
            const jsonStr = data
              .replace(/(['"])?([a-zA-Z0-9]+)(['"])?:/g, '"$2":')
              .replace(/'/g,'"');
            return JSON.parse(jsonStr);
        });
    });
});

const statements = allRequests.map(request => {
  return `INSERT INTO contribution_referral_codes (braze_uuid, source, referral_code, campaign_id) VALUES ('${request.brazeUuid}','${request.source}','${request.code}','${request.campaignId}') ON CONFLICT (referral_code) DO NOTHING;`;
});

fs.writeFileSync('statements.sql', statements.join('\n'));