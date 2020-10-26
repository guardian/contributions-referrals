import {Pool, QueryConfig, QueryResult} from 'pg';
import {ReferralCreatedEvent} from "./models";
import {handleQuery} from "../../lib/db";

export function writeReferralCode(record: ReferralCreatedEvent, pool: Pool): Promise<QueryResult> {
    const query: QueryConfig = {
        text: `
            INSERT INTO contribution_referral_codes(
                braze_uuid,
                source,
                referral_code,
                campaign_id
            ) VALUES (
                $1, $2, $3, $4
            )
            ON CONFLICT DO NOTHING
            RETURNING *;
        `,
        values: [
            record.brazeUuid,
            record.source,
            record.code,
            record.campaignId
        ]
    };

    return handleQuery(pool.query(query), query);
}
