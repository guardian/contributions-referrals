export interface ReferralCountRequest {
    brazeUuid: string,
    campaignId: string,
    fromDate: Date,
}

export interface ApiGatewayResponse {
    statusCode: number,
    body?: string,
    headers?: object,
}
