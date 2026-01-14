import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DbService } from '../services/db-service';
import { getCorsHeaders } from '../utils/cors';
import { AddRecordSchema } from '../schemas/record.schema';

const TABLE_NAME = process.env.TABLE_NAME || 'Database';
const dbService = new DbService(TABLE_NAME);

export const addRecordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const origin = event.headers?.origin;

    const body = JSON.parse(event.body || '{}');
    
    // Validate input with Zod
    const result = AddRecordSchema.safeParse(body);
    
    if (!result.success) {
        return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
                message: 'Validation error',
                errors: result.error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            }),
        };
    }
    
    const { hashKey, rangeKey, data } = result.data;

    const item = await dbService.putRecord(hashKey, rangeKey, data);

    return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            message: 'Record added successfully',
            item,
        }),
    };
};
