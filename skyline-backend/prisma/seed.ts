import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    try {
        // Create currencies
        console.log("Creating currencies...");
        const rubCurrency = await prisma.currency.upsert({
            where: { code: "RUB" },
            update: {},
            create: {
                code: "RUB",
                name: "Russian Ruble",
                symbol: "₽",
                isActive: true,
                isFiat: true,
                decimals: 2,
            },
        });
        const rwfCurrency = await prisma.currency.upsert({
            where: { code: "RWF" },
            update: {},
            create: {
                code: "RWF",
                name: "Rwandan Franc",
                symbol: "FRw",
                isActive: true,
                isFiat: true,
                decimals: 2,
            },
        });
        console.log("✅ Currencies created");

        // Create initial exchange rate
        console.log("Creating exchange rate...");
        await prisma.exchangeRate.upsert({
            where: {
                fromCurrencyId_toCurrencyId: {
                    fromCurrencyId: rubCurrency.id,
                    toCurrencyId: rwfCurrency.id,
                },
            },
            update: {
                rate: 18.4,
                spread: 0.02,
                isActive: true,
            },
            create: {
                fromCurrencyId: rubCurrency.id,
                toCurrencyId: rwfCurrency.id,
                rate: 18.4,
                spread: 0.02,
                isActive: true,
                source: "Initial setup",
            },
        });
        console.log("✅ Exchange rate created");

        // Create basic admin user if not exists
        console.log('Checking admin user...');

        const adminEmail = 'akimanaviateur94@gmail.com';
        const adminPassword = 'Viateur123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        console.log(`Ensuring admin user ${adminEmail} exists with correct password...`);

        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
                emailVerified: true
            },
            create: {
                email: adminEmail,
                password: hashedPassword,
                firstName: 'Viateur',
                lastName: 'Akimana',
                role: 'ADMIN',
                status: 'ACTIVE',
                emailVerified: true,
                phoneNumber: '+250788123456'
            }
        });
        console.log('✅ Admin user synchronized successfully');

        // Summary
        const userCount = await prisma.user.count();

        console.log('\n🎉 Database seeding completed!');
        console.log(`📊 Summary:`);
        console.log(`   - Users: ${userCount}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });