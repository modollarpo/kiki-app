// Error Handling Utility
import { store } from '../stores';
import { addToast } from '../stores/slices/uiSlice';
import { AxiosError } from 'axios';

export const setupErrorHandling = () => {
  // React Native error handler
  const globalAny = global as any;
  if (typeof globalAny !== 'undefined' && globalAny.ErrorUtils) {
    globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
      console.error('React Native error:', error, isFatal);
      handleError(error, isFatal);
    });
  }
};

export const handleError = (error: any, isFatal: boolean = false) => {
  let message = 'An unexpected error occurred';
  let title = 'Error';

  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 400:
          title = 'Invalid Request';
          message = data?.message || data?.error || 'Please check your input and try again';
          break;
        case 401:
          title = 'Unauthorized';
          message = 'Your session has expired. Please log in again';
          break;
        case 403:
          title = 'Access Denied';
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          title = 'Not Found';
          message = 'The requested resource was not found';
          break;
        case 422:
          title = 'Validation Error';
          message = data?.message || 'Please check your input';
          break;
        case 429:
          title = 'Rate Limited';
          message = 'Too many requests. Please wait and try again';
          break;
        case 500:
          title = 'Server Error';
          message = 'Something went wrong on our end. Please try again later';
          break;
        case 502:
        case 503:
        case 504:
          title = 'Service Unavailable';
          message = 'Service temporarily unavailable. Please try again later';
          break;
        default:
          message = data?.message || data?.error || `Error ${status}`;
      }
    } else if (error.request) {
      title = 'Network Error';
      message = 'Unable to connect to server. Please check your internet connection';
    } else {
      message = error.message || 'Request failed';
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Show toast notification
  store.dispatch(addToast({
    type: isFatal ? 'error' : 'error',
    title,
    message,
    duration: isFatal ? 10000 : 5000,
  }));

  // Log to console
  console.error('Error handled:', { title, message, error, isFatal });

  // Send to error tracking service (Sentry, etc.)
  if (isFatal) {
    // sendToErrorTracking(error, { title, message });
  }
};

export const handleApiError = (error: any): { title: string; message: string } => {
  if (error instanceof AxiosError) {
    if (error.response) {
      const data = error.response.data as any;
      return {
        title: getErrorTitle(error.response.status),
        message: data?.message || data?.error || `Error ${error.response.status}`,
      };
    } else if (error.request) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to server. Please check your internet connection',
      };
    }
  }
  
  return {
    title: 'Error',
    message: error?.message || 'An unexpected error occurred',
  };
};

const getErrorTitle = (status: number): string => {
  switch (status) {
    case 400: return 'Invalid Request';
    case 401: return 'Unauthorized';
    case 403: return 'Access Denied';
    case 404: return 'Not Found';
    case 422: return 'Validation Error';
    case 429: return 'Rate Limited';
    case 500: return 'Server Error';
    case 502:
    case 503:
    case 504: return 'Service Unavailable';
    default: return 'Error';
  }
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const createError = (message: string, code: string, statusCode: number = 500): AppError => {
  return new AppError(message, code, statusCode);
};

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};