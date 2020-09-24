import {Pool, QueryConfig, QueryResult} from 'pg';
import {handleQuery} from "../../lib/db";

export function fetchReferralData(referralCode: string, pool: Pool): Promise<QueryResult> {
    const query: QueryConfig = {
        text: 'SELECT braze_uuid, campaign_id FROM contribution_referral_codes WHERE referral_code = $1;',
        values: [referralCode]
    };

    return handleQuery(pool.query(query), query);
}

interface SuccessfulReferral {
    brazeUuid: string,
    referralCode: string,
    campaignId: string,
}

export function writeSuccessfulReferral(successfulReferral: SuccessfulReferral, pool: Pool): Promise<QueryResult> {
    const query: QueryConfig = {
        text: `
            INSERT INTO contribution_successful_referrals(
                braze_uuid,
                referral_code,
                campaign_id
            ) VALUES (
                $1, $2, $3
            )
            RETURNING *;
        `,
        values: [
            successfulReferral.brazeUuid,
            successfulReferral.referralCode,
            successfulReferral.campaignId,
        ]
    };

    return handleQuery(pool.query(query), query);
}

export function fetchCampaignIds(brazeUuid: string, pool: Pool): Promise<QueryResult> {
    const query: QueryConfig = {
        text: 'SELECT DISTINCT(campaign_id) FROM contribution_successful_referrals WHERE braze_uuid = $1;',
        values: [brazeUuid]
    };

    return handleQuery(pool.query(query), query);
}
