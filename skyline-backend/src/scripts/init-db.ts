import { PrismaClient } from '@prisma/client';
import { BUSINESS_CONFIG } from '../config/business.config';

const prisma = new PrismaClient();

async function initializeDatabase() {
    try {
        console.log('Initializing database...');

        // Create currencies if they don't exist
        await prisma.currency.upsert({
            where: { code: 'RUB' },
            update: {},
            create: {
                code: 'RUB',
                name: 'Russian Ruble',
                symbol: '₽',
                isActive: true,
                isFiat: true,
                decimals: 2,
            },
        });

        await prisma.currency.upsert({
            where: { code: 'RWF' },
            update: {},
            create: {
                code: 'RWF',
                name: 'Rwandan Franc',
                symbol: 'FRw',
                isActive: true,
                isFiat: true,
                decimals: 2,
            },
        });

        // Create initial exchange rate
        const rubCurrency = await prisma.currency.findUnique({ where: { code: 'RUB' } });
        const rwfCurrency = await prisma.currency.findUnique({ where: { code: 'RWF' } });

        if (rubCurrency && rwfCurrency) {
            await prisma.exchangeRate.upsert({
                where: {
                    fromCurrencyId_toCurrencyId: {
                        fromCurrencyId: rubCurrency.id,
                        toCurrencyId: rwfCurrency.id
                    }
                },
                update: {
                    rate: BUSINESS_CONFIG.FIXED_RUB_TO_RWF,
                    spread: 0.02,
                    isActive: true,
                },
                create: {
                    fromCurrencyId: rubCurrency.id,
                    toCurrencyId: rwfCurrency.id,
                    rate: BUSINESS_CONFIG.FIXED_RUB_TO_RWF,
                    spread: 0.02,
                    isActive: true,
                    source: 'Initial setup',
                },
            });
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export default initializeDatabase;

if (require.main === module) {
    initializeDatabase();
}
