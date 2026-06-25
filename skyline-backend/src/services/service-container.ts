import { ExchangeRateService } from './exchange-rate.service';

/**
 * Service Container
 * Centralized service management and singleton access
 */
export class ServiceContainer {
    /**
     * Get the singleton instance of ExchangeRateService
     */
    static get exchangeRateService(): ExchangeRateService {
        return ExchangeRateService.getInstance();
    }

    /**
     * Cleanup all services on application shutdown
     */
    static async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up services...');

        // Cleanup ExchangeRateService
        ServiceContainer.exchangeRateService.destroy();

        console.log('✅ Services cleaned up successfully');
    }
}
