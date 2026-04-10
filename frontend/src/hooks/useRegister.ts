
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { parseApiError, type ApiError } from '../utils/apiError';

export const useRegister = () => {
    const mutation = useMutation<
        Awaited<ReturnType<typeof authService.register>>,
        Error,
        { email: string; password: string; fullName: string; username: string }
    >({
        mutationFn: async ({ email, password, fullName, username }) => {
            return await authService.register(email, password, fullName, username);
        },
        onError: (error) => {
            const parsed = parseApiError(error);
            console.error('Registration failed:', parsed);
        }
    });

    const parsedError: ApiError | null = mutation.error ? parseApiError(mutation.error) : null;

    return {
        register: mutation.mutate,
        registerAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: parsedError,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess
    };
};
