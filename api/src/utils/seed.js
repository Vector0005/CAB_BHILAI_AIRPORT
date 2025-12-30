import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@raipurtaxi.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@raipurtaxi.com',
      phone: '9827198271',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      role: 'ADMIN'
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create sample drivers
  const drivers = [
    {
      name: 'Ramesh Kumar',
      email: 'ramesh@raipurtaxi.com',
      phone: '9827198272',
      license: 'CG12-2024-001',
      vehicle: 'Swift Dzire',
      vehicleNo: 'CG04-AB-1234',
      status: 'AVAILABLE'
    },
    {
      name: 'Suresh Singh',
      email: 'suresh@raipurtaxi.com',
      phone: '9827198273',
      license: 'CG12-2024-002',
      vehicle: 'Toyota Etios',
      vehicleNo: 'CG04-CD-5678',
      status: 'AVAILABLE'
    },
    {
      name: 'Mohan Patel',
      email: 'mohan@raipurtaxi.com',
      phone: '9827198274',
      license: 'CG12-2024-003',
      vehicle: 'Honda City',
      vehicleNo: 'CG04-EF-9012',
      status: 'AVAILABLE'
    }
  ];

  for (const driverData of drivers) {
    const driver = await prisma.driver.upsert({
      where: { email: driverData.email },
      update: {},
      create: driverData
    });
    console.log('✅ Driver created:', driver.name);
  }

  // Create availability for next 30 days
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);

  const availabilityData = [];
  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    availabilityData.push({
      date: new Date(d),
      morningAvailable: Math.random() > 0.2, // 80% available
      eveningAvailable: Math.random() > 0.2, // 80% available
      maxBookings: 10,
      currentBookings: 0
    });
  }

  for (const availData of availabilityData) {
    const availability = await prisma.availability.upsert({
      where: { date: availData.date },
      update: {},
      create: availData
    });
    console.log('✅ Availability created for:', availability.date.toDateString());
  }

  // Create sample bookings
  const sampleBookings = [
    {
      bookingNumber: 'BK' + Date.now().toString().slice(-8) + 'ABCD',
      userId: adminUser.id,
      name: 'John Doe',
      phone: '9827198201',
      email: 'john@example.com',
      pickupLocation: 'Bhilai, Sector 1',
      dropoffLocation: 'Raipur Airport',
      pickupDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      pickupTime: 'morning',
      tripType: 'HOME_TO_AIRPORT',
      status: 'PENDING',
      price: 800,
      paymentStatus: 'PENDING'
    },
    {
      bookingNumber: 'BK' + (Date.now() + 1).toString().slice(-8) + 'EFGH',
      userId: adminUser.id,
      name: 'Jane Smith',
      phone: '9827198202',
      email: 'jane@example.com',
      pickupLocation: 'Raipur Airport',
      dropoffLocation: 'Bhilai, Sector 2',
      pickupDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      pickupTime: 'evening',
      tripType: 'AIRPORT_TO_HOME',
      status: 'CONFIRMED',
      price: 900,
      paymentStatus: 'PAID'
    }
  ];

  for (const bookingData of sampleBookings) {
    const booking = await prisma.booking.create({
      data: bookingData
    });
    console.log('✅ Sample booking created:', booking.bookingNumber);
  }

  console.log('🎉 Database seeding completed!');
  console.log('📧 Admin login: admin@raipurtaxi.com / password');
  console.log('📱 Sample users created with bookings');
  console.log('🚗 3 drivers created and available');
  console.log('📅 Availability created for next 30 days');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });