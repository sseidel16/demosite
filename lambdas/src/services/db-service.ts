import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

export class DbService {
    private client: DynamoDBClient;
    private tableName: string;

    constructor(tableName: string) {
        this.client = new DynamoDBClient({});
        this.tableName = tableName;
    }

    async putRecord(hashKey: string, rangeKey: string, data?: Record<string, any>) {
        const item = {
            DemoHashKey: hashKey,
            DemoRangeKey: rangeKey,
            ...data,
            createdAt: new Date().toISOString(),
        };

        const command = new PutItemCommand({
            TableName: this.tableName,
            Item: marshall(item),
        });

        await this.client.send(command);
        return item;
    }

    async deleteRecord(hashKey: string, rangeKey: string) {
        const command = new DeleteItemCommand({
            TableName: this.tableName,
            Key: marshall({
                DemoHashKey: hashKey,
                DemoRangeKey: rangeKey,
            }),
        });

        await this.client.send(command);
    }
}
