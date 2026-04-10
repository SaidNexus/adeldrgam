
import { AxiosError } from 'axios';

export type ApiError = {
    message: string;
    code?: string;
    details?: Record<string, string[]>; // Field-specific errors
};

type FastAPIErrorDetail = {
    loc: (string | number)[];
    msg: string;
    type: string;
};

type FastAPIErrorResponse = {
    detail: string | FastAPIErrorDetail[];
};

export const parseApiError = (error: unknown, fallbackMessage = 'An unexpected error occurred'): ApiError => {
    if (!error) {
        return { message: fallbackMessage };
    }

    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const data = error.response?.data as FastAPIErrorResponse | undefined;

        // Handle Network Error
        if (error.code === 'ERR_NETWORK') {
            return { message: 'Network error. Please check your connection.' };
        }

        // Handle 400/409/422 Validation Errors
        if (data?.detail) {
            // Case 1: Detail is a simple string (e.g., "Username already exists")
            if (typeof data.detail === 'string') {
                return {
                    message: data.detail,
                    code: status?.toString()
                };
            }

            // Case 2: Detail is an array of validation errors (FastAPI default)
            if (Array.isArray(data.detail)) {
                const details: Record<string, string[]> = {};

                // Get the first error message for the main display
                let primaryMessage = fallbackMessage;

                data.detail.forEach((err, index) => {
                    const field = err.loc[err.loc.length - 1]?.toString() || 'global';
                    if (!details[field]) {
                        details[field] = [];
                    }
                    details[field].push(err.msg);

                    // Set primary message to the first error found
                    if (index === 0) {
                        primaryMessage = `${field}: ${err.msg}`;
                    }
                });

                return {
                    message: primaryMessage, // Or a generic "Validation failed"
                    details,
                    code: status?.toString()
                };
            }
        }

        // Handle other HTTP errors without specific detail payload
        if (status) {
            switch (status) {
                case 401: return { message: 'Unauthorized. Please login again.', code: '401' };
                case 403: return { message: 'Access denied.', code: '403' };
                case 404: return { message: 'Resource not found.', code: '404' };
                case 500: return { message: 'Server error. Please try again later.', code: '500' };
            }
        }
    }

    // Fallback for non-Axios errors or unhandled cases
    return {
        message: error instanceof Error ? error.message : fallbackMessage
    };
};
