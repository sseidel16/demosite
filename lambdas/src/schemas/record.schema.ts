import { z } from 'zod';

// Maximum sizes to prevent abuse
const MAX_STRING_LENGTH = 100;
const MAX_DATA_SIZE = 1000; // 1KB for the data field

export const AddRecordSchema = z.object({
    hashKey: z.string().min(5).max(MAX_STRING_LENGTH),
    rangeKey: z.string().min(5).max(MAX_STRING_LENGTH),
    data: z.any().optional().transform((val) => {
        if (val === undefined || val === null) return undefined;
        return JSON.stringify(val);
    }).pipe(z.string().max(MAX_DATA_SIZE).optional()),
});

export const DeleteRecordSchema = z.object({
    hashKey: z.string().min(5).max(MAX_STRING_LENGTH),
    rangeKey: z.string().min(5).max(MAX_STRING_LENGTH),
});

export type AddRecordInput = z.infer<typeof AddRecordSchema>;
export type DeleteRecordInput = z.infer<typeof DeleteRecordSchema>;
