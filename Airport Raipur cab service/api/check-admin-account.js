import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminAccount() {
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (admin) {
      console.log('Admin account found:');
      console.log(`ID: ${admin.id}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Phone: ${admin.phone}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Created: ${admin.createdAt}`);
      
      // Test login with current password
      console.log('\nTesting login with password: admin123');
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare('admin123', admin.password);
      console.log(`Password valid: ${isValid}`);
      
      if (!isValid) {
        console.log('\n⚠️  Password mismatch detected!');
        console.log('Resetting admin password to: admin123');
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
          where: { id: admin.id },
          data: { password: hashedPassword }
        });
        
        console.log('✅ Admin password reset successfully');
        console.log('Try logging in with:');
        console.log('Email: admin@raipurtaxi.com');
        console.log('Password: admin123');
      }
    } else {
      console.log('❌ No admin account found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminAccount();