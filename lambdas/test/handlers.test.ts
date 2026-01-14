import { addRecordHandler } from '../src/handlers/add-record';
import { deleteRecordHandler } from '../src/handlers/delete-record';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Lambda Handlers E2E Tests', () => {
    const testHashKey = `test-${Date.now()}`;
    const testRangeKey = `range-${Date.now()}`;

    const createMockEvent = (body: any): APIGatewayProxyEvent => {
        return {
            body: JSON.stringify(body),
            headers: {},
            multiValueHeaders: {},
            httpMethod: 'POST',
            isBase64Encoded: false,
            path: '/test',
            pathParameters: null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };
    };

    test('should add a record to DynamoDB', async () => {
        const event = createMockEvent({
            hashKey: testHashKey,
            rangeKey: testRangeKey,
            data: { name: 'Test Item', value: 123 },
        });

        const result = await addRecordHandler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Record added successfully');
        expect(body.item.DemoHashKey).toBe(testHashKey);
        expect(body.item.DemoRangeKey).toBe(testRangeKey);
    });

    test('should fail to add record without required fields', async () => {
        const event = createMockEvent({
            data: { name: 'Test Item' },
        });

        const result = await addRecordHandler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Validation error');
        expect(body.errors).toBeDefined();
        expect(Array.isArray(body.errors)).toBe(true);
    });

    test('should delete a record from DynamoDB', async () => {
        // First add a record
        const addEvent = createMockEvent({
            hashKey: testHashKey,
            rangeKey: testRangeKey,
            data: { name: 'To Delete' },
        });
        await addRecordHandler(addEvent);

        // Then delete it
        const deleteEvent = createMockEvent({
            hashKey: testHashKey,
            rangeKey: testRangeKey,
        });

        const result = await deleteRecordHandler(deleteEvent);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Record deleted successfully');
    });

    test('should fail to delete record without required fields', async () => {
        const event = createMockEvent({
            hashKey: testHashKey,
        });

        const result = await deleteRecordHandler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Validation error');
        expect(body.errors).toBeDefined();
        expect(Array.isArray(body.errors)).toBe(true);
    });
});
