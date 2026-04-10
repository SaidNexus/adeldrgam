
import { parseApiError } from './src/utils/apiError';
import { AxiosError } from 'axios';

// Mock generic error
const genericError = new Error('Something went wrong');
console.log('Generic Error:', parseApiError(genericError));

// Mock Axios Network Error
const networkError = new AxiosError('Network Error');
networkError.code = 'ERR_NETWORK';
console.log('Network Error:', parseApiError(networkError));

// Mock FastAPI 400 String Error
const stringError = new AxiosError('Bad Request');
stringError.response = {
    status: 400,
    data: { detail: 'Username already exists' },
    statusText: 'Bad Request',
    headers: {},
    config: {} as any,
};
console.log('String Error (400):', parseApiError(stringError));

// Mock FastAPI 422 Array Error
const arrayError = new AxiosError('Validation Error');
arrayError.response = {
    status: 422,
    data: {
        detail: [
            { loc: ['body', 'email'], msg: 'field required', type: 'value_error.missing' },
            { loc: ['body', 'password'], msg: 'password too short', type: 'value_error.any_str.min_length' }
        ]
    },
    statusText: 'Unprocessable Entity',
    headers: {},
    config: {} as any,
};
console.log('Array Error (422):', parseApiError(arrayError));
