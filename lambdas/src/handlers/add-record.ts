import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DbService } from '../services/db-service';
import { getCorsHeaders } from '../utils/cors';

const TABLE_NAME = process.env.TABLE_NAME || 'Database';
const dbService = new DbService(TABLE_NAME);

export const addRecordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const origin = event.headers?.origin;

    try {
        const body = JSON.parse(event.body || '{}');
        const { hashKey, rangeKey, data } = body;

        if (!hashKey || !rangeKey) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({
                    message: 'Missing required fields: hashKey and rangeKey',
                }),
            };
        }

        const item = await dbService.putRecord(hashKey, rangeKey, data);

        return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
                message: 'Record added successfully',
                item,
            }),
        };
    } catch (error) {
        console.error('Error adding record:', error);
        return {
            statusCode: 500,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
