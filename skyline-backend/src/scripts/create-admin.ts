import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@skyline-transfers.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
            },
            create: {
                email: adminEmail,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Admin',
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
                emailVerified: true,
            },
        });

        console.log(`✅ Admin user ${admin.email} created/updated successfully.`);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
