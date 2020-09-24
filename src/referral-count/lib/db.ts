import {Pool, QueryConfig, QueryResult} from "pg";
import {handleQuery} from "../../lib/db";
import {ReferralCountRequest} from "./models";

export function fetchReferralCount(request: ReferralCountRequest, pool: Pool): Promise<QueryResult> {
    const query: QueryConfig = {
        text: 'SELECT COUNT(*) AS referrals FROM contribution_successful_referrals WHERE braze_uuid = $1 AND campaign_id = $2 AND acquisition_timestamp >= $3;',
        values: [request.brazeUuid, request.campaignId, request.fromDate.toISOString()]
    };

    return handleQuery(pool.query(query), query);
}
