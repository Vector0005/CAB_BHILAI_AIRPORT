import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixMorningAvailability() {
    try {
        console.log('🔄 Fixing morning availability for current dates...');
        
        const today = new Date();
        const datesToFix = [];
        
        // Create dates for next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(0, 0, 0, 0);
            datesToFix.push(date);
        }
        
        for (const date of datesToFix) {
            const dateStr = date.toISOString().split('T')[0];
            console.log(`Checking availability for ${dateStr}...`);
            
            // Check if availability exists
            let availability = await prisma.availability.findFirst({
                where: { date: date }
            });
            
            if (availability) {
                // Update existing availability to make morning slots available
                await prisma.availability.update({
                    where: { id: availability.id },
                    data: {
                        morningAvailable: true,
                        eveningAvailable: availability.eveningAvailable || true
                    }
                });
                console.log(`✅ Updated availability for ${dateStr}: Morning=true, Evening=${availability.eveningAvailable || true}`);
            } else {
                // Create new availability
                await prisma.availability.create({
                    data: {
                        date: date,
                        morningAvailable: true,
                        eveningAvailable: true
                    }
                });
                console.log(`✅ Created new availability for ${dateStr}: Morning=true, Evening=true`);
            }
        }
        
        console.log('🎉 Morning availability fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing morning availability:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixMorningAvailability();