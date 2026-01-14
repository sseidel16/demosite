import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DbService } from '../services/db-service';
import { getCorsHeaders } from '../utils/cors';
import { DeleteRecordSchema } from '../schemas/record.schema';

const TABLE_NAME = process.env.TABLE_NAME || 'Database';
const dbService = new DbService(TABLE_NAME);

export const deleteRecordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const origin = event.headers?.origin;

    const body = JSON.parse(event.body || '{}');
    
    // Validate input with Zod
    const result = DeleteRecordSchema.safeParse(body);
    
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
    
    const { hashKey, rangeKey } = result.data;

    await dbService.deleteRecord(hashKey, rangeKey);

    return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            message: 'Record deleted successfully',
        }),
    };
};
