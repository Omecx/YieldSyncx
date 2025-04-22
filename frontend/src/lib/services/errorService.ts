export class ErrorService {
    private static readonly errorMessages: Record<string, string> = {
      'NETWORK_MISMATCH': 'Please switch to Moonbase Alpha network in MetaMask',
      'INSUFFICIENT_FUNDS': 'Insufficient DEV balance for transaction',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait and try again',
      'INVALID_DATA': 'Invalid sensor data format',
      'CONNECTION_LOST': 'Connection to blockchain lost. Please refresh',
      'CERTIFICATION_FAILED': 'Unable to certify record. Check your permissions',
      'BATCH_CREATION_FAILED': 'Failed to create data batch',
      'UNAUTHORIZED': 'You do not have permission to perform this action'
    };
    
    static getUserFriendlyMessage(error: any): string {
      if (error.code && this.errorMessages[error.code]) {
        return this.errorMessages[error.code];
      }
      
      if (error.message) {
        // Parse common MetaMask error patterns
        if (error.message.includes('user rejected')) {
          return 'Transaction was rejected by user';
        }
        if (error.message.includes('nonce too low')) {
          return 'Transaction error. Please retry';
        }
        if (error.message.includes('insufficient funds')) {
          return 'Insufficient balance to complete transaction';
        }
      }
      
      return 'An unexpected error occurred. Please try again';
    }
    
    static displayError(error: any) {
      const message = this.getUserFriendlyMessage(error);
      trigger({
        message,
        background: 'preset-filled-error'
      });
      
      // Log detailed error for debugging
      console.error('Detailed error:', error);
    }
  }