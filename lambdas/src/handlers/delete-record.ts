import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DbService } from '../services/db-service';
import { getCorsHeaders } from '../utils/cors';
import { DeleteRecordSchema } from '../schemas/record.schema';
import { ZodError } from 'zod';

const TABLE_NAME = process.env.TABLE_NAME || 'Database';
const dbService = new DbService(TABLE_NAME);

export const deleteRecordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const origin = event.headers?.origin;

    try {
        const body = JSON.parse(event.body || '{}');
        
        // Validate input with Zod
        const validatedData = DeleteRecordSchema.parse(body);
        const { hashKey, rangeKey } = validatedData;

        await dbService.deleteRecord(hashKey, rangeKey);

        return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
                message: 'Record deleted successfully',
            }),
        };
    } catch (error) {
        console.error('Error deleting record:', error);
        
        // Handle validation errors
        if (error instanceof ZodError) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({
                    message: 'Validation error',
                    errors: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                }),
            };
        }
        
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
