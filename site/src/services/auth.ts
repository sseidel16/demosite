import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { config } from '../config';

// Configure Amplify
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: config.aws.userPoolId,
            userPoolClientId: config.aws.userPoolClientId,
        }
    }
});

export interface User {
    username: string;
    email?: string;
    name?: string;
}

export const authService = {
    /**
     * Sign in with SRP authentication
     * Returns the sign in result which may include challenges
     */
    async signIn(username: string, password: string) {
        return await signIn({ username, password });
    },

    /**
     * Complete new password challenge
     */
    async completeNewPassword(newPassword: string) {
        return await confirmSignIn({ challengeResponse: newPassword });
    },

    /**
     * Sign out current user
     */
    async signOut(): Promise<void> {
        await signOut();
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            const user = await getCurrentUser();
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken;
            
            return {
                username: user.username,
                email: idToken?.payload.email as string | undefined,
                name: idToken?.payload.name as string | undefined,
            };
        } catch (error) {
            return null;
        }
    },

    /**
     * Get the current auth token
     */
    async getAuthToken(): Promise<string | null> {
        try {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString() || null;
        } catch (error) {
            return null;
        }
    },
};
