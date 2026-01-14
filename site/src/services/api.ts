import { authService } from './auth';
import { config } from '../config';

const API_ENDPOINT = config.api.endpoint;

export interface Record {
    hashKey: string;
    rangeKey: string;
    data?: any;
}

export const apiService = {
    /**
     * Add a record to DynamoDB
     */
    async addRecord(record: Record): Promise<void> {
        const token = await authService.getAuthToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_ENDPOINT}/add-record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify(record),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add record');
        }

        return await response.json();
    },

    /**
     * Delete a record from DynamoDB
     */
    async deleteRecord(hashKey: string, rangeKey: string): Promise<void> {
        const token = await authService.getAuthToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_ENDPOINT}/delete-record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify({ hashKey, rangeKey }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete record');
        }

        return await response.json();
    },
};
